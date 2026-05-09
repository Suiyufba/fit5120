import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const CREATE_USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INTEGER,
  region TEXT,
  security_question TEXT,
  security_answer_hash TEXT,
  experience_level TEXT NOT NULL DEFAULT 'newcomer',
  assessment_score INTEGER NOT NULL DEFAULT 0,
  assessment_answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

interface UserResult {
  id: string;
  email: string;
  age: number | null;
  region: string | null;
  securityQuestion: string;
  experienceLevel: string;
  assessmentScore: number;
  assessmentAnswers: unknown;
  createdAt: string;
  updatedAt: string;
}

interface AuthUserResult extends UserResult {
  passwordHash: string;
  securityAnswerHash: string;
}

export async function initUserStore(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;

  await pool.query(CREATE_USERS_TABLE_SQL);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS security_question TEXT`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS security_answer_hash TEXT`);
  return true;
}

function mapUserRow(row: Record<string, unknown>): UserResult | null {
  if (!row) return null;

  return {
    id: String(row.id),
    email: row.email as string,
    age: row.age as number | null,
    region: row.region as string | null,
    securityQuestion: (row.security_question as string) || '',
    experienceLevel: row.experience_level as string,
    assessmentScore: row.assessment_score as number,
    assessmentAnswers: row.assessment_answers_json || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function findUserByEmail(email: unknown): Promise<AuthUserResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT id, email, password_hash, age, region, security_question, security_answer_hash, experience_level, assessment_score,
           assessment_answers_json, created_at, updated_at
    FROM app_users
    WHERE email = $1
    `,
    [email]
  );

  if (!result.rowCount) return null;
  const row = result.rows[0] as Record<string, unknown>;
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash as string,
    securityAnswerHash: row.security_answer_hash as string,
  } as AuthUserResult;
}

export async function findUserById(userId: unknown): Promise<UserResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    SELECT id, email, age, region, security_question, experience_level, assessment_score,
           assessment_answers_json, created_at, updated_at
    FROM app_users
    WHERE id = $1
    `,
    [userId]
  );

  if (!result.rowCount) return null;
  return mapUserRow(result.rows[0] as Record<string, unknown>);
}

interface CreateUserInput {
  email: string;
  passwordHash: string;
  age?: number | null;
  region?: string | null;
  securityQuestion?: string;
  securityAnswerHash?: string;
  level?: string;
  score?: number;
  answers?: unknown;
}

export async function createUser({ email, passwordHash, age, region, securityQuestion, securityAnswerHash, level, score, answers }: CreateUserInput): Promise<UserResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    INSERT INTO app_users (
      email, password_hash, age, region, security_question, security_answer_hash, experience_level, assessment_score, assessment_answers_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    RETURNING id, email, age, region, security_question, experience_level, assessment_score,
              assessment_answers_json, created_at, updated_at
    `,
    [
      email,
      passwordHash,
      age,
      region,
      securityQuestion,
      securityAnswerHash,
      level,
      score,
      JSON.stringify(answers || {}),
    ]
  );

  return mapUserRow(result.rows[0] as Record<string, unknown>);
}

interface UpdatePasswordInput {
  email: string;
  passwordHash: string;
}

export async function updateUserPasswordByEmail({ email, passwordHash }: UpdatePasswordInput): Promise<UserResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    UPDATE app_users
    SET password_hash = $2, updated_at = NOW()
    WHERE email = $1
    RETURNING id, email, age, region, security_question, experience_level, assessment_score,
              assessment_answers_json, created_at, updated_at
    `,
    [email, passwordHash]
  );

  if (!result.rowCount) return null;
  return mapUserRow(result.rows[0] as Record<string, unknown>);
}

interface UpdateProfileResult {
  error?: string;
  ok?: boolean;
  user?: UserResult;
}

export async function updateOwnProfileById(userId: unknown, { age, region }: { age: unknown; region: unknown }): Promise<UpdateProfileResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const ageNumber = Number.parseInt(String(age), 10);
  const normalizedRegion = String(region || '').trim();

  if (Number.isNaN(ageNumber) || ageNumber < 10 || ageNumber > 100) {
    return { error: 'age must be between 10 and 100' };
  }

  if (!normalizedRegion) {
    return { error: 'region is required' };
  }

  const result = await pool.query(
    `
    UPDATE app_users
    SET age = $2,
        region = $3,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, age, region, security_question, experience_level, assessment_score,
              assessment_answers_json, created_at, updated_at
    `,
    [userId, ageNumber, normalizedRegion]
  );

  if (!result.rowCount) return { ok: false };
  return { ok: true, user: mapUserRow(result.rows[0] as Record<string, unknown>) };
}

interface UpdateCredentialsResult {
  error?: string;
  ok?: boolean;
  user?: UserResult;
}

export async function updateOwnCredentialsById(userId: unknown, { email, passwordHash }: { email: unknown; passwordHash: unknown }): Promise<UpdateCredentialsResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const wantsEmailUpdate = Boolean(normalizedEmail);
  const wantsPasswordUpdate = Boolean(passwordHash);

  if (!wantsEmailUpdate && !wantsPasswordUpdate) {
    return { error: 'email or password update is required' };
  }

  try {
    const result = await pool.query(
      `
      UPDATE app_users
      SET email = COALESCE($2, email),
          password_hash = COALESCE($3, password_hash),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, age, region, security_question, experience_level, assessment_score,
                assessment_answers_json, created_at, updated_at
      `,
      [userId, wantsEmailUpdate ? normalizedEmail : null, passwordHash || null]
    );

    if (!result.rowCount) return { ok: false };
    return { ok: true, user: mapUserRow(result.rows[0] as Record<string, unknown>) };
  } catch (error: unknown) {
    if (String(error instanceof Error ? error.message : String(error)).toLowerCase().includes('unique')) {
      return { error: 'email already exists' };
    }
    throw error;
  }
}

interface ListUsersOptions {
  limit?: number;
}

export async function listUsers({ limit = 200 }: ListUsersOptions = {}): Promise<UserResult[]> {
  const pool = getPgPool();
  if (!pool) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
  const result = await pool.query(
    `
    SELECT id, email, age, region, security_question, experience_level, assessment_score,
           assessment_answers_json, created_at, updated_at
    FROM app_users
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [safeLimit]
  );
  return result.rows.map((row: Record<string, unknown>) => mapUserRow(row) as UserResult);
}

export async function deleteUserById(userId: unknown): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;

  const result = await pool.query('DELETE FROM app_users WHERE id = $1', [userId]);
  return result.rowCount > 0;
}

interface UpdateUserInput {
  email: unknown;
  region: unknown;
  experienceLevel: unknown;
  assessmentScore: unknown;
}

interface UpdateUserResult {
  error?: string;
  ok?: boolean;
  user?: UserResult;
}

export async function updateUserById(userId: unknown, { email, region, experienceLevel, assessmentScore }: UpdateUserInput): Promise<UpdateUserResult | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRegion = String(region || '').trim();
  const normalizedLevel = String(experienceLevel || '').trim().toLowerCase();
  const normalizedScore = Number(assessmentScore);

  if (!normalizedEmail) {
    return { error: 'email is required' };
  }

  if (!['newcomer', 'intermediate', 'advanced'].includes(normalizedLevel)) {
    return { error: 'experienceLevel must be newcomer, intermediate, or advanced' };
  }

  if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 100) {
    return { error: 'assessmentScore must be a number between 0 and 100' };
  }

  try {
    const result = await pool.query(
      `
      UPDATE app_users
      SET email = $2,
          region = $3,
          experience_level = $4,
          assessment_score = $5,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, age, region, security_question, experience_level, assessment_score,
                assessment_answers_json, created_at, updated_at
      `,
      [userId, normalizedEmail, normalizedRegion || null, normalizedLevel, Math.round(normalizedScore)]
    );

    if (!result.rowCount) return { ok: false };
    return { ok: true, user: mapUserRow(result.rows[0] as Record<string, unknown>) };
  } catch (error: unknown) {
    if (String(error instanceof Error ? error.message : String(error)).toLowerCase().includes('unique')) {
      return { error: 'email already exists' };
    }
    throw error;
  }
}
