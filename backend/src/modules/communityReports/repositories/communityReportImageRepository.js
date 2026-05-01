import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS community_report_images (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  byte_size INTEGER,
  thumbnail BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Hard cap on stored thumbnail size. The frontend resizes images down to a
// small JPEG/WebP before upload, so anything larger than ~512KB is suspicious.
const MAX_THUMBNAIL_BYTES = 512 * 1024;

const memoryImages = new Map();

function normalizeMime(value) {
  const mime = String(value || '').trim().toLowerCase();
  return ALLOWED_MIME.has(mime) ? mime : '';
}

function decodeDataUrl(dataUrl) {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:([\w./+-]+);base64,(.+)$/i);
  if (!match) return null;

  const mime = normalizeMime(match[1]);
  if (!mime) return null;

  let buffer;
  try {
    buffer = Buffer.from(match[2], 'base64');
  } catch (_error) {
    return null;
  }
  if (!buffer.length) return null;
  if (buffer.length > MAX_THUMBNAIL_BYTES) return null;

  return { mime, buffer };
}

export async function initCommunityReportImageStore() {
  const pool = getPgPool();
  if (!pool) return false;
  await pool.query(CREATE_TABLE_SQL);
  return true;
}

export async function createCommunityReportImage(payload = {}) {
  const decoded = decodeDataUrl(payload.dataUrl);
  if (!decoded) {
    return { error: 'Image must be a base64 data URL (image/jpeg, image/png or image/webp) under 512KB.' };
  }

  const width = Number.isFinite(Number(payload.width)) ? Number(payload.width) : null;
  const height = Number.isFinite(Number(payload.height)) ? Number(payload.height) : null;
  const id = randomUUID();
  const pool = getPgPool();

  if (!pool) {
    memoryImages.set(id, {
      id,
      mime: decoded.mime,
      buffer: decoded.buffer,
      width,
      height,
      byteSize: decoded.buffer.length,
      createdAt: new Date(),
    });
    return { id, storage: 'memory', byteSize: decoded.buffer.length };
  }

  await pool.query(
    `
    INSERT INTO community_report_images (
      id, mime_type, width, height, byte_size, thumbnail, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [id, decoded.mime, width, height, decoded.buffer.length, decoded.buffer]
  );

  return { id, storage: 'database', byteSize: decoded.buffer.length };
}

export async function findCommunityReportImage(imageId) {
  const id = String(imageId || '').trim();
  if (!id) return null;

  const pool = getPgPool();
  if (!pool) {
    const record = memoryImages.get(id);
    if (!record) return null;
    return {
      id: record.id,
      mime: record.mime,
      buffer: record.buffer,
      width: record.width,
      height: record.height,
    };
  }

  const result = await pool.query(
    `
    SELECT id, mime_type, width, height, thumbnail
    FROM community_report_images
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );
  if (!result.rowCount) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    mime: row.mime_type,
    buffer: Buffer.isBuffer(row.thumbnail) ? row.thumbnail : Buffer.from(row.thumbnail || ''),
    width: row.width,
    height: row.height,
  };
}
