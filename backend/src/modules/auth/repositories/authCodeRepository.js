import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_AUTH_CODES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS auth_codes (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_codes_lookup
ON auth_codes (email, purpose, created_at DESC);
`;

export async function initAuthCodeStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_AUTH_CODES_TABLE_SQL);
  return true;
}

export async function invalidateCodes({ email, purpose }) {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(
    `
    UPDATE auth_codes
    SET used_at = NOW()
    WHERE email = $1 AND purpose = $2 AND used_at IS NULL
    `,
    [email, purpose]
  );
}

export async function createAuthCode({ email, purpose, codeHash, payload, expiresAt }) {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    INSERT INTO auth_codes (email, purpose, code_hash, payload_json, expires_at)
    VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
    RETURNING id, email, purpose, code_hash, payload_json, attempts, expires_at, used_at, created_at
    `,
    [email, purpose, codeHash, JSON.stringify(payload || {}), expiresAt]
  );

  return result.rows[0] || null;
}

export async function getLatestActiveCode({ email, purpose }) {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT id, email, purpose, code_hash, payload_json, attempts, expires_at, used_at, created_at
    FROM auth_codes
    WHERE email = $1
      AND purpose = $2
      AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [email, purpose]
  );

  return result.rows[0] || null;
}

export async function incrementAttempts(id) {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(
    `
    UPDATE auth_codes
    SET attempts = attempts + 1
    WHERE id = $1
    `,
    [id]
  );
}

export async function markCodeUsed(id) {
  const pool = getPgPool();
  if (!pool) return;

  await pool.query(
    `
    UPDATE auth_codes
    SET used_at = NOW()
    WHERE id = $1
    `,
    [id]
  );
}
