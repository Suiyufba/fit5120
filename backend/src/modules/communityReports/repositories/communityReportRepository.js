import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  hazard_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  reporter_name TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const ALLOWED_TYPES = new Set(['fire', 'flood', 'storm', 'trail', 'other']);
const ALLOWED_SEVERITY = new Set(['low', 'moderate', 'high', 'extreme']);

const memoryReports = [
  {
    id: randomUUID(),
    title: 'Smoke near Cathedral Range',
    description: 'Strong smoke smell and visible haze from ridge section. Recommend avoiding Neds Gully Track until conditions clear.',
    hazardType: 'fire',
    severity: 'high',
    locationName: 'Neds Gully Track, Cathedral Range',
    latitude: -37.507,
    longitude: 145.712,
    imageUrl: '',
    reporterName: 'Local Hiker',
    reportedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    likes: 12,
    views: 450,
  },
  {
    id: randomUUID(),
    title: 'Deep mud on Razorback Trail',
    description: 'Trail is slippery after overnight rain. Trekking poles and gaiters strongly recommended.',
    hazardType: 'storm',
    severity: 'moderate',
    locationName: 'Razorback Trail, Alpine National Park',
    latitude: -36.862,
    longitude: 147.28,
    imageUrl: '',
    reporterName: 'Trail Volunteer',
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 8,
    views: 1200,
  },
  {
    id: randomUUID(),
    title: 'Fallen tree blocking route',
    description: 'Large tree across the main line. Passable only with difficult bypass on loose ground.',
    hazardType: 'trail',
    severity: 'high',
    locationName: 'Mt Buller West Ridge',
    latitude: -37.145,
    longitude: 146.428,
    imageUrl: '',
    reporterName: 'Weekend Group',
    reportedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    likes: 24,
    views: 890,
  },
];

function text(value, fallback = '') {
  return (value ?? fallback).toString().trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBlockedHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

function normalizeImageUrl(value) {
  const raw = text(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid image protocol');
    }
    if (isBlockedHostname(parsed.hostname)) {
      throw new Error('Image host is not allowed');
    }
    return parsed.toString();
  } catch (_error) {
    throw new Error('imageUrl must be a valid public HTTP/HTTPS URL');
  }
}

function normalizeInput(payload = {}) {
  const title = text(payload.title);
  const description = text(payload.description);
  const locationName = text(payload.locationName);
  const hazardType = text(payload.hazardType).toLowerCase();
  const severity = text(payload.severity).toLowerCase();
  const reporterName = text(payload.reporterName, 'Anonymous Hiker');
  let imageUrl = '';
  try {
    imageUrl = normalizeImageUrl(payload.imageUrl);
  } catch (error) {
    return { error: error.message };
  }
  const latitude = toNumber(payload.latitude);
  const longitude = toNumber(payload.longitude);

  if (!title || !description || !locationName) {
    return { error: 'title, description and locationName are required' };
  }

  if (!ALLOWED_TYPES.has(hazardType)) {
    return { error: 'hazardType must be one of: fire, flood, storm, trail, other' };
  }

  if (!ALLOWED_SEVERITY.has(severity)) {
    return { error: 'severity must be one of: low, moderate, high, extreme' };
  }

  if (latitude === null || longitude === null) {
    return { error: 'latitude and longitude must be valid numbers' };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'latitude/longitude out of range' };
  }

  return {
    input: {
      title,
      description,
      locationName,
      hazardType,
      severity,
      reporterName,
      imageUrl,
      latitude,
      longitude,
    },
  };
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    hazardType: row.hazard_type,
    severity: row.severity,
    locationName: row.location_name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    imageUrl: row.image_url || '',
    reporterName: row.reporter_name,
    likes: Number(row.likes || 0),
    views: Number(row.views || 0),
    reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : new Date().toISOString(),
  };
}

export async function initCommunityReportStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_TABLE_SQL);
  await pool.query(`ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE`);
  return true;
}

export async function listCommunityReports(limit = 50) {
  const size = Math.max(1, Math.min(Number(limit) || 50, 100));
  const pool = getPgPool();

  if (!pool) {
    return {
      reports: memoryReports
        .slice()
        .sort((a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt))
        .slice(0, size),
      storage: 'memory',
    };
  }

  const result = await pool.query(
    `
    SELECT id, title, description, hazard_type, severity, location_name,
           latitude, longitude, image_url, reporter_name, likes, views, reported_at
    FROM community_reports
    WHERE is_deleted = FALSE
    ORDER BY reported_at DESC
    LIMIT $1
    `,
    [size]
  );

  return {
    reports: result.rows.map(mapRow),
    storage: 'database',
  };
}

export async function createCommunityReport(payload) {
  const parsed = normalizeInput(payload);
  if (parsed.error) return parsed;

  const pool = getPgPool();
  const input = parsed.input;

  if (!pool) {
    const memoryRecord = {
      id: randomUUID(),
      ...input,
      likes: 0,
      views: 0,
      reportedAt: new Date().toISOString(),
    };
    memoryReports.unshift(memoryRecord);
    return { report: memoryRecord, storage: 'memory' };
  }

  const id = randomUUID();
  const result = await pool.query(
    `
    INSERT INTO community_reports (
      id, title, description, hazard_type, severity, location_name,
      latitude, longitude, image_url, reporter_name, likes, views, reported_at, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,NOW(),NOW(),NOW())
    RETURNING id, title, description, hazard_type, severity, location_name,
              latitude, longitude, image_url, reporter_name, likes, views, reported_at
    `,
    [
      id,
      input.title,
      input.description,
      input.hazardType,
      input.severity,
      input.locationName,
      input.latitude,
      input.longitude,
      input.imageUrl || null,
      input.reporterName,
    ]
  );

  return {
    report: mapRow(result.rows[0]),
    storage: 'database',
  };
}

export async function deleteCommunityReportById(reportId) {
  const id = text(reportId);
  if (!id) return { ok: false };

  const pool = getPgPool();
  if (!pool) {
    const index = memoryReports.findIndex((item) => item.id === id);
    if (index < 0) return { ok: false };
    memoryReports.splice(index, 1);
    return { ok: true, storage: 'memory' };
  }

  const result = await pool.query(
    `
    UPDATE community_reports
    SET is_deleted = TRUE, updated_at = NOW()
    WHERE id = $1
    `,
    [id]
  );
  return { ok: result.rowCount > 0, storage: 'database' };
}

export async function updateCommunityReportById(reportId, payload = {}) {
  const id = text(reportId);
  if (!id) return { error: 'Invalid report id' };

  const parsed = normalizeInput(payload);
  if (parsed.error) return parsed;

  const pool = getPgPool();
  const input = parsed.input;

  if (!pool) {
    const index = memoryReports.findIndex((item) => item.id === id);
    if (index < 0) return { ok: false, storage: 'memory' };
    memoryReports[index] = {
      ...memoryReports[index],
      ...input,
    };
    return { ok: true, report: memoryReports[index], storage: 'memory' };
  }

  const result = await pool.query(
    `
    UPDATE community_reports
    SET title = $2,
        description = $3,
        hazard_type = $4,
        severity = $5,
        location_name = $6,
        latitude = $7,
        longitude = $8,
        image_url = $9,
        reporter_name = $10,
        updated_at = NOW()
    WHERE id = $1
      AND is_deleted = FALSE
    RETURNING id, title, description, hazard_type, severity, location_name,
              latitude, longitude, image_url, reporter_name, likes, views, reported_at
    `,
    [
      id,
      input.title,
      input.description,
      input.hazardType,
      input.severity,
      input.locationName,
      input.latitude,
      input.longitude,
      input.imageUrl || null,
      input.reporterName,
    ]
  );

  if (!result.rowCount) return { ok: false, storage: 'database' };
  return { ok: true, report: mapRow(result.rows[0]), storage: 'database' };
}
