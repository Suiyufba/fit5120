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

const memoryImages = new Map<string, Record<string, unknown>>();

function normalizeMime(value: unknown): string {
  const mime = String(value || '').trim().toLowerCase();
  return ALLOWED_MIME.has(mime) ? mime : '';
}

function decodeDataUrl(dataUrl: unknown): { mime: string; buffer: Buffer } | null {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:([\w./+-]+);base64,(.+)$/i);
  if (!match) return null;

  const mime = normalizeMime(match[1]);
  if (!mime) return null;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], 'base64');
  } catch (_error) {
    return null;
  }
  if (!buffer.length) return null;
  if (buffer.length > MAX_THUMBNAIL_BYTES) return null;

  return { mime, buffer };
}

interface CreateImageResult {
  error?: string;
  id?: string;
  storage?: string;
  byteSize?: number;
}

export async function initCommunityReportImageStore(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;
  await pool.query(CREATE_TABLE_SQL);
  return true;
}

export async function createCommunityReportImage(payload: Record<string, unknown> = {}): Promise<CreateImageResult> {
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

interface ImageResult {
  id: string;
  mime: string;
  buffer: Buffer;
  width: number | null;
  height: number | null;
}

export async function findCommunityReportImage(imageId: unknown): Promise<ImageResult | null> {
  const id = String(imageId || '').trim();
  if (!id) return null;

  const pool = getPgPool();
  if (!pool) {
    const record = memoryImages.get(id);
    if (!record) return null;
    return {
      id: record.id as string,
      mime: record.mime as string,
      buffer: record.buffer as Buffer,
      width: record.width as number | null,
      height: record.height as number | null,
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

  const row = result.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    mime: row.mime_type as string,
    buffer: Buffer.isBuffer(row.thumbnail) ? row.thumbnail as Buffer : Buffer.from(String(row.thumbnail || '')),
    width: row.width as number | null,
    height: row.height as number | null,
  };
}
