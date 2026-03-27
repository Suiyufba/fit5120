import { getPgPool } from './postgresClient.js';

const SNAPSHOT_ID = 1;

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

export async function initHazardSnapshotStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_TABLE_SQL);
  return true;
}

export async function saveLatestHazardSnapshot(snapshot) {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(
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
      JSON.stringify(snapshot.hazards || []),
      JSON.stringify(snapshot.sourceStatus || []),
      Boolean(snapshot.fromFallback),
      snapshot.lastError || null,
      snapshot.fetchedAt || new Date().toISOString(),
    ]
  );

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
