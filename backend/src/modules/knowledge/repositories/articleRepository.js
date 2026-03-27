import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CANDIDATE_TABLES = [
  'knowledge_articles',
  'knowledge_hub_articles',
  'blog_articles',
  'articles'
];

function pickString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  const text = String(value || '').toLowerCase();
  return text === 'true' || text === 'yes' || text === 'y';
}

function rowToArticle(row, index) {
  const title = pickString(row.title || row.headline || row.name);
  const summary = pickString(row.summary || row.excerpt || row.description || row.subtitle);
  const content = pickString(row.content || row.body || row.article_text || summary);
  if (!title || !content) return null;

  return {
    id: pickString(row.id || row.article_id || `article-${index}`),
    title,
    summary,
    content,
    imageUrl: pickString(row.image_url || row.imageurl || row.cover_image || row.thumbnail_url || row.image),
    topic: pickString(row.topic || row.category || row.section || 'General'),
    readMinutes: toNumber(row.read_minutes || row.reading_time || row.read_time, 5),
    publishedAt: pickString(row.published_at || row.publish_date || row.created_at || row.updated_at),
    updatedAt: pickString(row.updated_at || row.modified_at || row.created_at),
    sourceUrl: pickString(row.source_url || row.reference_url || row.link),
    isFeatured: toBoolean(row.is_featured || row.featured),
  };
}

async function findArticleTableName(pool) {
  const result = await pool.query(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    `,
    [CANDIDATE_TABLES]
  );

  if (!result.rowCount) return null;
  const existing = new Set(result.rows.map((row) => row.table_name));
  return CANDIDATE_TABLES.find((name) => existing.has(name)) || null;
}

export async function fetchKnowledgeArticles({ topic }) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error('Database is not configured');
  }

  const tableName = await findArticleTableName(pool);
  if (!tableName) {
    throw new Error('No knowledge article table found');
  }

  const result = await pool.query(`SELECT * FROM ${tableName} LIMIT 200`);
  let articles = result.rows.map(rowToArticle).filter(Boolean);

  if (topic) {
    const topicLower = String(topic).trim().toLowerCase();
    if (topicLower && topicLower !== 'all') {
      articles = articles.filter((article) => article.topic.toLowerCase() === topicLower);
    }
  }

  articles.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    const aTs = Date.parse(a.publishedAt || '') || 0;
    const bTs = Date.parse(b.publishedAt || '') || 0;
    return bTs - aTs;
  });

  return articles;
}
