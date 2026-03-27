import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INTEGER,
  region TEXT,
  experience_level TEXT NOT NULL DEFAULT 'newcomer',
  assessment_score INTEGER NOT NULL DEFAULT 0,
  assessment_answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function initUserStore() {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_USERS_TABLE_SQL);
  return true;
}

function mapUserRow(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    email: row.email,
    age: row.age,
    region: row.region,
    experienceLevel: row.experience_level,
    assessmentScore: row.assessment_score,
    assessmentAnswers: row.assessment_answers_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByEmail(email) {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT id, email, password_hash, age, region, experience_level, assessment_score,
           assessment_answers_json, created_at, updated_at
    FROM app_users
    WHERE email = $1
    `,
    [email]
  );

  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash,
  };
}

export async function findUserById(userId) {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT id, email, age, region, experience_level, assessment_score,
           assessment_answers_json, created_at, updated_at
    FROM app_users
    WHERE id = $1
    `,
    [userId]
  );

  if (!result.rowCount) return null;
  return mapUserRow(result.rows[0]);
}

export async function createUser({ email, passwordHash, age, region, level, score, answers }) {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    INSERT INTO app_users (
      email, password_hash, age, region, experience_level, assessment_score, assessment_answers_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    RETURNING id, email, age, region, experience_level, assessment_score,
              assessment_answers_json, created_at, updated_at
    `,
    [
      email,
      passwordHash,
      age,
      region,
      level,
      score,
      JSON.stringify(answers || {}),
    ]
  );

  return mapUserRow(result.rows[0]);
}

export async function updateUserPasswordByEmail({ email, passwordHash }) {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    UPDATE app_users
    SET password_hash = $2, updated_at = NOW()
    WHERE email = $1
    RETURNING id, email, age, region, experience_level, assessment_score,
              assessment_answers_json, created_at, updated_at
    `,
    [email, passwordHash]
  );

  if (!result.rowCount) return null;
  return mapUserRow(result.rows[0]);
}
