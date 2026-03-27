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
  const directMatch = await pool.query(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    `,
    [CANDIDATE_TABLES]
  );

  if (directMatch.rowCount) {
    const existing = new Set(directMatch.rows.map((row) => row.table_name));
    const preferred = CANDIDATE_TABLES.find((name) => existing.has(name));
    if (preferred) return preferred;
  }

  const columnsResult = await pool.query(
    `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name
    `
  );

  const byTable = new Map();
  columnsResult.rows.forEach((row) => {
    const current = byTable.get(row.table_name) || new Set();
    current.add(row.column_name);
    byTable.set(row.table_name, current);
  });

  const titleColumns = ['title', 'headline', 'name'];
  const contentColumns = ['content', 'body', 'article_text', 'description', 'summary', 'excerpt'];
  const imageColumns = ['image_url', 'cover_image', 'thumbnail_url', 'image'];
  const excluded = new Set(['app_users', 'hazard_latest_snapshot']);

  for (const [tableName, columns] of byTable.entries()) {
    if (excluded.has(tableName)) continue;
    const hasTitle = titleColumns.some((col) => columns.has(col));
    const hasContent = contentColumns.some((col) => columns.has(col));
    const hasImageOrTopic = imageColumns.some((col) => columns.has(col)) || columns.has('topic') || columns.has('category');
    if (hasTitle && hasContent && hasImageOrTopic) {
      return tableName;
    }
  }

  return null;
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
