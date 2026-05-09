import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS route_plan_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  start_point JSONB NOT NULL,
  end_point JSONB NOT NULL,
  plan_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;

const CREATE_USER_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_route_plan_history_user_created_at
ON route_plan_history (user_id, created_at DESC)
`;

const CREATE_SESSION_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_route_plan_history_session_created_at
ON route_plan_history (session_id, created_at DESC)
`;

function sanitizePoint(point: Record<string, unknown> = {}) {
  return {
    lat: Number(point.lat),
    lng: Number(point.lng),
  };
}

export async function initRoutePlanHistoryStore() {
  const pool = getPgPool();
  if (!pool) return false;
  await pool.query(CREATE_TABLE_SQL);
  await pool.query(CREATE_USER_INDEX_SQL);
  await pool.query(CREATE_SESSION_INDEX_SQL);
  return true;
}

export async function createRoutePlanHistoryEntry({
  userId,
  sessionId,
  start,
  end,
  planPayload,
}) {
  const pool = getPgPool();
  if (!pool) return null;

  const normalizedUserId = String(userId || '').trim() || null;
  const normalizedSessionId = String(sessionId || '').trim() || null;
  if (!normalizedUserId && !normalizedSessionId) return null;

  const result = await pool.query(
    `
      INSERT INTO route_plan_history (user_id, session_id, start_point, end_point, plan_payload)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
      RETURNING id, created_at
    `,
    [
      normalizedUserId,
      normalizedSessionId,
      JSON.stringify(sanitizePoint(start)),
      JSON.stringify(sanitizePoint(end)),
      JSON.stringify(planPayload || {}),
    ]
  );

  return result.rows[0] || null;
}

export async function listRoutePlanHistory({
  userId,
  sessionId,
  limit = 20,
}) {
  const pool = getPgPool();
  if (!pool) return [];

  const normalizedUserId = String(userId || '').trim() || null;
  const normalizedSessionId = String(sessionId || '').trim() || null;
  if (!normalizedUserId && !normalizedSessionId) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const args = [];
  const where = [];
  if (normalizedUserId) {
    args.push(normalizedUserId);
    where.push(`user_id = $${args.length}`);
  }
  if (normalizedSessionId) {
    args.push(normalizedSessionId);
    where.push(`session_id = $${args.length}`);
  }
  args.push(safeLimit);

  const sql = `
    SELECT id, user_id, session_id, start_point, end_point, plan_payload, created_at
    FROM route_plan_history
    WHERE ${where.map((clause) => `(${clause})`).join(' OR ')}
    ORDER BY created_at DESC
    LIMIT $${args.length}
  `;
  const result = await pool.query(sql, args);
  return result.rows || [];
}

export async function deleteRoutePlanHistoryEntry({
  entryId,
  userId,
  sessionId,
}) {
  const pool = getPgPool();
  if (!pool) return false;

  const normalizedEntryId = Number(entryId);
  if (!Number.isInteger(normalizedEntryId) || normalizedEntryId <= 0) return false;

  const normalizedUserId = String(userId || '').trim() || null;
  const normalizedSessionId = String(sessionId || '').trim() || null;
  if (!normalizedUserId && !normalizedSessionId) return false;

  const args: (number | string | null)[] = [normalizedEntryId];
  const ownerWhere = [];
  if (normalizedUserId) {
    args.push(normalizedUserId);
    ownerWhere.push(`user_id = $${args.length}`);
  }
  if (normalizedSessionId) {
    args.push(normalizedSessionId);
    ownerWhere.push(`session_id = $${args.length}`);
  }

  const result = await pool.query(
    `
      DELETE FROM route_plan_history
      WHERE id = $1
      AND (${ownerWhere.join(' OR ')})
    `,
    args
  );

  return (result.rowCount || 0) > 0;
}

export async function clearRoutePlanHistory({
  userId,
  sessionId,
}) {
  const pool = getPgPool();
  if (!pool) return 0;

  const normalizedUserId = String(userId || '').trim() || null;
  const normalizedSessionId = String(sessionId || '').trim() || null;
  if (!normalizedUserId && !normalizedSessionId) return 0;

  const args = [];
  const where = [];
  if (normalizedUserId) {
    args.push(normalizedUserId);
    where.push(`user_id = $${args.length}`);
  }
  if (normalizedSessionId) {
    args.push(normalizedSessionId);
    where.push(`session_id = $${args.length}`);
  }

  const result = await pool.query(
    `
      DELETE FROM route_plan_history
      WHERE ${where.map((clause) => `(${clause})`).join(' OR ')}
    `,
    args
  );

  return result.rowCount || 0;
}
