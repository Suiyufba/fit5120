import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';
import { assessHikerLevel } from '../domain/assessment.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPasswordByEmail
} from '../repositories/userRepository.js';
import {
  createAuthCode,
  getLatestActiveCode,
  incrementAttempts,
  invalidateCodes,
  markCodeUsed
} from '../repositories/authCodeRepository.js';
import { sendVerificationCodeEmail } from './mailerService.js';

const PURPOSE_REGISTER = 'register';
const PURPOSE_PASSWORD_RESET = 'password_reset';
const MAX_CODE_ATTEMPTS = 5;

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    age: user.age,
    region: user.region,
    experienceLevel: user.experienceLevel,
    assessmentScore: user.assessmentScore,
    createdAt: user.createdAt,
  };
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.authJwtSecret, {
    expiresIn: config.authJwtExpiresIn,
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getCodeExpiryDate() {
  return new Date(Date.now() + config.authCodeExpiresMinutes * 60 * 1000);
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validateRegisterInput({ email, password, age, region }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email');
  }

  if (!password || String(password).length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const ageNumber = Number.parseInt(age, 10);
  if (Number.isNaN(ageNumber) || ageNumber < 10 || ageNumber > 100) {
    throw new Error('Age must be between 10 and 100');
  }

  if (!String(region || '').trim()) {
    throw new Error('Region is required');
  }

  return {
    normalizedEmail,
    ageNumber,
    normalizedRegion: String(region).trim(),
  };
}

async function saveAuthCode({ email, purpose, payload }) {
  const rawCode = generateCode();
  const codeHash = await bcrypt.hash(rawCode, 8);

  await invalidateCodes({ email, purpose });
  await createAuthCode({
    email,
    purpose,
    codeHash,
    payload,
    expiresAt: getCodeExpiryDate().toISOString(),
  });

  return rawCode;
}

function isCodeExpired(codeRow) {
  const expiryTs = Date.parse(codeRow?.expires_at || '');
  if (Number.isNaN(expiryTs)) return true;
  return Date.now() > expiryTs;
}

async function readValidCodeOrThrow({ email, purpose, code }) {
  const codeRow = await getLatestActiveCode({ email, purpose });
  if (!codeRow) throw new Error('Verification code not found or expired');
  if (isCodeExpired(codeRow)) throw new Error('Verification code expired');
  if ((codeRow.attempts || 0) >= MAX_CODE_ATTEMPTS) throw new Error('Too many invalid attempts');

  const ok = await bcrypt.compare(String(code || ''), codeRow.code_hash);
  if (!ok) {
    await incrementAttempts(codeRow.id);
    throw new Error('Invalid verification code');
  }

  return codeRow;
}

export async function requestRegisterCode(input) {
  const { normalizedEmail, ageNumber, normalizedRegion } = validateRegisterInput(input);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Email already registered');
  }

  const { level, score } = assessHikerLevel(input.assessmentAnswers || {});
  const passwordHash = await bcrypt.hash(String(input.password), 10);
  const rawCode = await saveAuthCode({
    email: normalizedEmail,
    purpose: PURPOSE_REGISTER,
    payload: {
      email: normalizedEmail,
      passwordHash,
      age: ageNumber,
      region: normalizedRegion,
      level,
      score,
      answers: input.assessmentAnswers || {},
    },
  });

  const delivery = await sendVerificationCodeEmail({
    to: normalizedEmail,
    code: rawCode,
    actionLabel: 'registration',
  });

  return {
    email: normalizedEmail,
    expiresInMinutes: config.authCodeExpiresMinutes,
    delivery,
    debugCode: delivery.sent ? undefined : rawCode,
  };
}

export async function verifyRegisterCode({ email, code }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !code) {
    throw new Error('Email and verification code are required');
  }

  const codeRow = await readValidCodeOrThrow({
    email: normalizedEmail,
    purpose: PURPOSE_REGISTER,
    code,
  });

  const registration = codeRow.payload_json || {};
  const user = await createUser({
    email: registration.email,
    passwordHash: registration.passwordHash,
    age: registration.age,
    region: registration.region,
    level: registration.level,
    score: registration.score,
    answers: registration.answers || {},
  });

  if (!user) {
    throw new Error('User store unavailable');
  }

  await markCodeUsed(codeRow.id);

  const token = signToken(user.id);
  return {
    token,
    user: sanitizeUser(user),
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required');
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = signToken(user.id);
  return {
    token,
    user: sanitizeUser(user),
  };
}

export async function requestPasswordResetCode({ email }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email');
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return {
      email: normalizedEmail,
      expiresInMinutes: config.authCodeExpiresMinutes,
      delivery: { sent: true },
    };
  }

  const rawCode = await saveAuthCode({
    email: normalizedEmail,
    purpose: PURPOSE_PASSWORD_RESET,
    payload: { email: normalizedEmail },
  });

  const delivery = await sendVerificationCodeEmail({
    to: normalizedEmail,
    code: rawCode,
    actionLabel: 'password reset',
  });

  return {
    email: normalizedEmail,
    expiresInMinutes: config.authCodeExpiresMinutes,
    delivery,
    debugCode: delivery.sent ? undefined : rawCode,
  };
}

export async function confirmPasswordReset({ email, code, newPassword }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !code) {
    throw new Error('Email and verification code are required');
  }
  if (!newPassword || String(newPassword).length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const codeRow = await readValidCodeOrThrow({
    email: normalizedEmail,
    purpose: PURPOSE_PASSWORD_RESET,
    code,
  });

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  const user = await updateUserPasswordByEmail({
    email: normalizedEmail,
    passwordHash,
  });

  if (!user) {
    throw new Error('User not found');
  }

  await markCodeUsed(codeRow.id);
  return { ok: true };
}

export function verifyAuthToken(token) {
  try {
    const payload = jwt.verify(token, config.authJwtSecret);
    return payload?.sub ? String(payload.sub) : null;
  } catch (_error) {
    return null;
  }
}

export async function getProfileByUserId(userId) {
  const user = await findUserById(userId);
  return sanitizeUser(user);
}
