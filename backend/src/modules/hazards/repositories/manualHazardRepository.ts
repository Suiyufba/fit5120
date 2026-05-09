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

interface HazardRow {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  source: string;
  created_by: string;
  is_active: boolean;
  updated_at: string;
}

interface HazardResult {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  source: string;
  updatedAt: string;
  coordinates: [number, number];
  meta: {
    manual: boolean;
    createdBy: string;
    isActive: boolean;
  };
}

interface MemoryHazard {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  latitude: number;
  longitude: number;
  source: string;
  createdBy: string;
  coordinates: [number, number];
  updatedAt: string;
  meta: { manual: boolean; createdBy: string; isActive: boolean };
}

interface ValidateSuccess {
  input: {
    title: string;
    description: string;
    type: string;
    severity: string;
    latitude: number;
    longitude: number;
    source: string;
    createdBy: string;
  };
}

interface ValidateError {
  error: string;
}

type ValidateResult = ValidateSuccess | ValidateError;

const memoryManualHazards: MemoryHazard[] = [];

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown, fallback = ''): string {
  return (value ?? fallback).toString().trim();
}

function mapRow(row: Record<string, unknown>): HazardResult {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    type: row.type as string,
    severity: row.severity as string,
    source: (row.source as string) || 'Admin Dashboard',
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
    coordinates: [Number(row.latitude), Number(row.longitude)],
    meta: {
      manual: true,
      createdBy: (row.created_by as string) || 'admin',
      isActive: Boolean(row.is_active),
    },
  };
}

export async function initManualHazardStore(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_TABLE_SQL);
  return true;
}

export function validateManualHazard(payload: Record<string, unknown> = {}): ValidateResult {
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

interface ListManualHazardsOptions {
  includeInactive?: boolean;
}

export async function listManualHazards({ includeInactive = false }: ListManualHazardsOptions = {}): Promise<HazardResult[]> {
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
  return result.rows.map((row: Record<string, unknown>) => mapRow(row));
}

interface CreateHazardResult {
  error?: string;
  hazard?: HazardResult;
}

export async function createManualHazard(payload: Record<string, unknown> = {}): Promise<CreateHazardResult> {
  const validated = validateManualHazard(payload);
  if ('error' in validated && validated.error) return validated;

  const pool = getPgPool();
  const input = (validated as ValidateSuccess).input;

  if (!pool) {
    const item: MemoryHazard = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      type: input.type,
      severity: input.severity,
      latitude: input.latitude,
      longitude: input.longitude,
      source: input.source,
      createdBy: input.createdBy,
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
  return { hazard: mapRow(result.rows[0] as Record<string, unknown>) };
}

interface UpdateHazardResult {
  error?: string;
  ok?: boolean;
  hazard?: HazardResult;
}

export async function updateManualHazard(id: unknown, payload: Record<string, unknown> = {}): Promise<UpdateHazardResult> {
  const hazardId = toText(id);
  if (!hazardId) return { error: 'Invalid risk id' };

  const validated = validateManualHazard(payload);
  if ('error' in validated && validated.error) return validated;
  const input = (validated as ValidateSuccess).input;

  const pool = getPgPool();
  if (!pool) {
    const index = memoryManualHazards.findIndex((item) => item.id === hazardId);
    if (index < 0) return { ok: false };
    memoryManualHazards[index] = {
      ...memoryManualHazards[index],
      title: input.title,
      description: input.description,
      type: input.type,
      severity: input.severity,
      latitude: input.latitude,
      longitude: input.longitude,
      source: input.source,
      createdBy: input.createdBy,
      coordinates: [input.latitude, input.longitude],
      updatedAt: new Date().toISOString(),
    };
    return { ok: true, hazard: memoryManualHazards[index] };
  }

  const result = await pool.query(
    `
    UPDATE manual_hazards
    SET title = $2,
        description = $3,
        type = $4,
        severity = $5,
        latitude = $6,
        longitude = $7,
        source = $8,
        updated_at = NOW()
    WHERE id = $1
      AND is_active = TRUE
    RETURNING id, title, description, type, severity, latitude, longitude, source, created_by, is_active, updated_at
    `,
    [
      hazardId,
      input.title,
      input.description,
      input.type,
      input.severity,
      input.latitude,
      input.longitude,
      input.source,
    ]
  );

  if (!result.rowCount) return { ok: false };
  return { ok: true, hazard: mapRow(result.rows[0] as Record<string, unknown>) };
}

interface ArchiveResult {
  ok: boolean;
}

export async function archiveManualHazard(id: unknown): Promise<ArchiveResult> {
  const pool = getPgPool();
  if (!pool) {
    const index = memoryManualHazards.findIndex((item) => item.id === id);
    if (index === -1) return { ok: false };
    memoryManualHazards[index].meta = { ...memoryManualHazards[index].meta, isActive: false };
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
