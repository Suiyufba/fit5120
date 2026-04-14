import { getPgPool } from './postgresClient.js';

const SNAPSHOT_ID = 1;
const HISTORY_LIMIT_MAX = 500;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS hazard_latest_snapshot (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  hazards_json JSONB NOT NULL,
  source_status_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  from_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  last_error TEXT,
  fetched_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const CREATE_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS hazard_snapshot_history (
  id BIGSERIAL PRIMARY KEY,
  hazards_json JSONB NOT NULL,
  source_status_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  from_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  last_error TEXT,
  fetched_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const CREATE_HISTORY_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_hazard_snapshot_history_fetched_at
ON hazard_snapshot_history (fetched_at DESC);
`;

export async function initHazardSnapshotStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_TABLE_SQL);
  await pool.query(CREATE_HISTORY_TABLE_SQL);
  await pool.query(CREATE_HISTORY_INDEX_SQL);
  return true;
}

export async function saveLatestHazardSnapshot(snapshot) {
  const pool = getPgPool();
  if (!pool) return false;

  const hazardsJson = JSON.stringify(snapshot.hazards || []);
  const sourceStatusJson = JSON.stringify(snapshot.sourceStatus || []);
  const fromFallback = Boolean(snapshot.fromFallback);
  const lastError = snapshot.lastError || null;
  const fetchedAt = snapshot.fetchedAt || new Date().toISOString();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
      INSERT INTO hazard_latest_snapshot (
        id, hazards_json, source_status_json, from_fallback, last_error, fetched_at, updated_at
      ) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6::timestamptz, NOW())
      ON CONFLICT (id) DO UPDATE
      SET hazards_json = EXCLUDED.hazards_json,
          source_status_json = EXCLUDED.source_status_json,
          from_fallback = EXCLUDED.from_fallback,
          last_error = EXCLUDED.last_error,
          fetched_at = EXCLUDED.fetched_at,
          updated_at = NOW()
      `,
      [
        SNAPSHOT_ID,
        hazardsJson,
        sourceStatusJson,
        fromFallback,
        lastError,
        fetchedAt,
      ]
    );

    await client.query(
      `
      INSERT INTO hazard_snapshot_history (
        hazards_json, source_status_json, from_fallback, last_error, fetched_at, recorded_at
      ) VALUES ($1::jsonb, $2::jsonb, $3, $4, $5::timestamptz, NOW())
      `,
      [
        hazardsJson,
        sourceStatusJson,
        fromFallback,
        lastError,
        fetchedAt,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return true;
}

export async function getLatestHazardSnapshot() {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT hazards_json, source_status_json, from_fallback, last_error, fetched_at
    FROM hazard_latest_snapshot
    WHERE id = $1
    `,
    [SNAPSHOT_ID]
  );

  if (!result.rowCount) return null;

  const row = result.rows[0];
  return {
    hazards: Array.isArray(row.hazards_json) ? row.hazards_json : [],
    sourceStatus: Array.isArray(row.source_status_json) ? row.source_status_json : [],
    fromFallback: Boolean(row.from_fallback),
    lastError: row.last_error || null,
    fetchedAt: row.fetched_at ? new Date(row.fetched_at).toISOString() : new Date().toISOString(),
  };
}

function normalizeLimit(limit) {
  const next = Number(limit);
  if (!Number.isFinite(next)) return 24;
  return Math.max(1, Math.min(Math.floor(next), HISTORY_LIMIT_MAX));
}

export async function listHazardSnapshotHistory({ limit = 24 } = {}) {
  const pool = getPgPool();
  if (!pool) return [];

  const result = await pool.query(
    `
    SELECT
      id,
      fetched_at,
      recorded_at,
      from_fallback,
      last_error,
      jsonb_array_length(hazards_json) AS hazard_count
    FROM hazard_snapshot_history
    ORDER BY fetched_at DESC, id DESC
    LIMIT $1
    `,
    [normalizeLimit(limit)]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    fetchedAt: row.fetched_at ? new Date(row.fetched_at).toISOString() : null,
    recordedAt: row.recorded_at ? new Date(row.recorded_at).toISOString() : null,
    fromFallback: Boolean(row.from_fallback),
    lastError: row.last_error || null,
    hazardCount: Number(row.hazard_count || 0),
  }));
}
