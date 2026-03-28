import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS manual_hazards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'Admin Dashboard',
  created_by TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const ALLOWED_TYPES = new Set(['fire', 'flood', 'storm', 'heat', 'other']);
const ALLOWED_SEVERITY = new Set(['low', 'moderate', 'high', 'extreme']);

const memoryManualHazards = [];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value, fallback = '') {
  return (value ?? fallback).toString().trim();
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    severity: row.severity,
    source: row.source || 'Admin Dashboard',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    coordinates: [Number(row.latitude), Number(row.longitude)],
    meta: {
      manual: true,
      createdBy: row.created_by || 'admin',
      isActive: Boolean(row.is_active),
    },
  };
}

export async function initManualHazardStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_TABLE_SQL);
  return true;
}

export function validateManualHazard(payload = {}) {
  const title = toText(payload.title);
  const description = toText(payload.description);
  const type = toText(payload.type).toLowerCase();
  const severity = toText(payload.severity).toLowerCase();
  const latitude = toNumber(payload.latitude);
  const longitude = toNumber(payload.longitude);
  const source = toText(payload.source, 'Admin Dashboard');
  const createdBy = toText(payload.createdBy, 'admin');

  if (!title || !description) {
    return { error: 'title and description are required' };
  }
  if (!ALLOWED_TYPES.has(type)) {
    return { error: 'type must be one of: fire, flood, storm, heat, other' };
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
      type,
      severity,
      latitude,
      longitude,
      source,
      createdBy,
    },
  };
}

export async function listManualHazards({ includeInactive = false } = {}) {
  const pool = getPgPool();
  if (!pool) {
    return memoryManualHazards.filter((item) => includeInactive || item.meta?.isActive);
  }

  const result = await pool.query(
    `
    SELECT id, title, description, type, severity, latitude, longitude, source, created_by, is_active, updated_at
    FROM manual_hazards
    WHERE ($1::boolean IS TRUE OR is_active = TRUE)
    ORDER BY updated_at DESC
    `,
    [Boolean(includeInactive)]
  );
  return result.rows.map(mapRow);
}

export async function createManualHazard(payload = {}) {
  const validated = validateManualHazard(payload);
  if (validated.error) return validated;

  const pool = getPgPool();
  const input = validated.input;

  if (!pool) {
    const item = {
      id: randomUUID(),
      ...input,
      coordinates: [input.latitude, input.longitude],
      updatedAt: new Date().toISOString(),
      meta: { manual: true, createdBy: input.createdBy, isActive: true },
    };
    memoryManualHazards.unshift(item);
    return { hazard: item };
  }

  const result = await pool.query(
    `
    INSERT INTO manual_hazards (
      id, title, description, type, severity, latitude, longitude, source, created_by, is_active, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,NOW(),NOW())
    RETURNING id, title, description, type, severity, latitude, longitude, source, created_by, is_active, updated_at
    `,
    [
      randomUUID(),
      input.title,
      input.description,
      input.type,
      input.severity,
      input.latitude,
      input.longitude,
      input.source,
      input.createdBy,
    ]
  );
  return { hazard: mapRow(result.rows[0]) };
}

export async function archiveManualHazard(id) {
  const pool = getPgPool();
  if (!pool) {
    const index = memoryManualHazards.findIndex((item) => item.id === id);
    if (index === -1) return { ok: false };
    memoryManualHazards[index].meta = { ...(memoryManualHazards[index].meta || {}), isActive: false };
    return { ok: true };
  }

  const result = await pool.query(
    `
    UPDATE manual_hazards
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1
    `,
    [id]
  );
  return { ok: result.rowCount > 0 };
}
