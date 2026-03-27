import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CANDIDATE_TABLES = [
  'knowledge_articles',
  'knowledge_hub_articles',
  'blog_articles',
  'articles'
];

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  topic TEXT NOT NULL DEFAULT 'General',
  read_minutes INTEGER NOT NULL DEFAULT 5,
  source_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const SEEDED_ARTICLES = [
  {
    slug: 'victoria-bushfire-checklist-before-hike',
    title: 'Victoria Bushfire Checklist Before You Hike',
    summary: 'A practical pre-hike workflow to decide go / no-go on warm and windy days.',
    content:
      'Before departure, check VicEmergency incidents, wind direction, and road access around your trailhead. Set two clear triggers: one for postponing before start, and one for turning back mid-route. If fire weather conditions rise, avoid ridge tops and heavily forested dead-end tracks. Share your route and expected return time with a trusted contact.',
    image_url: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1400&q=80',
    topic: 'Hazard Safety',
    read_minutes: 6,
    source_url: 'https://www.emergency.vic.gov.au/',
    is_featured: true
  },
  {
    slug: 'heat-risk-hiking-victoria',
    title: 'Heat Risk on Victorian Trails: Timing, Hydration, and Pacing',
    summary: 'How to reduce heat exposure with route timing and effort management.',
    content:
      'Start early to avoid peak heat and keep a lower pace on exposed climbs. Carry enough water plus electrolytes, and schedule shaded cooling stops before you feel dehydrated. For long routes, plan refill points and keep a backup route that shortens time in direct sun. If your group shows signs of heat stress, stop and cool immediately.',
    image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
    topic: 'Weather Essentials',
    read_minutes: 5,
    source_url: 'https://www.bom.gov.au/',
    is_featured: false
  },
  {
    slug: 'rain-and-flood-crossing-decisions',
    title: 'Rain and Flood Crossing Decisions for Beginner Hikers',
    summary: 'Simple decision rules for creek crossings after rain events.',
    content:
      'Treat creek crossings as dynamic hazards after heavy rain. If water speed or depth increases beyond safe stepping, do not cross. Use mapped bridge alternatives and avoid low-lying shortcuts, especially near dusk. Build turnaround time into your itinerary so you are not forced to take risky crossings late in the day.',
    image_url: 'https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?auto=format&fit=crop&w=1400&q=80',
    topic: 'Hazard Safety',
    read_minutes: 4,
    source_url: 'https://www.ses.vic.gov.au/',
    is_featured: false
  },
  {
    slug: 'first-day-hiker-gear-that-matters',
    title: 'First-Day Hiker Gear That Actually Matters',
    summary: 'A realistic essentials list that improves safety without overpacking.',
    content:
      'Prioritize navigation, weather protection, lighting, and communication. Pack a charged phone, offline map, headlamp, thermal layer, and rain shell even on short day hikes. Add basic first aid and blister care because minor issues often become route-ending problems. Keep pack weight manageable by removing duplicate non-essential items.',
    image_url: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1400&q=80',
    topic: 'Getting Started',
    read_minutes: 5,
    source_url: 'https://www.parks.vic.gov.au/',
    is_featured: false
  },
  {
    slug: 'wind-and-storm-exposure-management',
    title: 'Wind and Storm Exposure Management on Open Ridges',
    summary: 'How to adapt route choices when gusts or thunderstorms are nearby.',
    content:
      'Open ridges and alpine sections amplify wind and lightning risk. If storms are forecast in your hiking window, choose lower and shorter alternatives with clear exit options. Delay exposed traverses and keep your group close enough for communication in gusty conditions. Re-check warnings at major decision points instead of relying on one morning check.',
    image_url: 'https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=1400&q=80',
    topic: 'Weather Essentials',
    read_minutes: 6,
    source_url: 'https://www.bom.gov.au/',
    is_featured: false
  },
  {
    slug: 'group-safety-briefing-template',
    title: 'A 3-Minute Group Safety Briefing Template',
    summary: 'Use this quick briefing to align route expectations before starting.',
    content:
      'Confirm route plan, turnaround time, hazard watch items, and communication roles before departure. Nominate one lead and one sweep, and agree on regroup intervals. If pace gaps widen, slow down early rather than pushing harder later. Good briefings reduce rushed decisions when conditions change.',
    image_url: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1400&q=80',
    topic: 'Getting Started',
    read_minutes: 4,
    source_url: 'https://www.parks.vic.gov.au/',
    is_featured: false
  }
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

  let tableName = await findArticleTableName(pool);
  if (!tableName) {
    await initKnowledgeArticleStore();
    tableName = await findArticleTableName(pool);
  }
  if (!tableName) throw new Error('No knowledge article table found');

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

export async function initKnowledgeArticleStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_TABLE_SQL);

  const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM knowledge_articles');
  const total = countResult.rows?.[0]?.total || 0;
  if (total > 0) return true;

  for (const article of SEEDED_ARTICLES) {
    await pool.query(
      `
      INSERT INTO knowledge_articles (
        slug, title, summary, content, image_url, topic, read_minutes, source_url, is_featured, published_at, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
      `,
      [
        article.slug,
        article.title,
        article.summary,
        article.content,
        article.image_url,
        article.topic,
        article.read_minutes,
        article.source_url,
        Boolean(article.is_featured)
      ]
    );
  }

  return true;
}
