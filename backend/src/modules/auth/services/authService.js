import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';
import { assessHikerLevel } from '../domain/assessment.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateOwnCredentialsById,
  updateOwnProfileById,
  updateUserPasswordByEmail
} from '../repositories/userRepository.js';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const RESET_MAX_ATTEMPTS = 3;
const RESET_LOCK_WINDOW_MS = 60 * 60 * 1000;
const passwordResetAttemptStore = new Map();

function isAdminEmail(email) {
  const normalized = normalizeEmail(email);
  return config.adminEmails.includes(normalized)
    || (config.localAdminEnabled && normalized === config.localAdminEmail);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    age: user.age,
    region: user.region,
    securityQuestion: user.securityQuestion,
    experienceLevel: user.experienceLevel,
    assessmentScore: user.assessmentScore,
    createdAt: user.createdAt,
    isAdmin: isAdminEmail(user.email),
  };
}

function buildLocalAdminUser() {
  return {
    id: config.localAdminUserId,
    email: config.localAdminEmail,
    age: null,
    region: 'Victoria',
    securityQuestion: 'Local admin shortcut',
    experienceLevel: 'advanced',
    assessmentScore: 100,
    createdAt: new Date().toISOString(),
  };
}

function isLocalAdminCredential(email, password) {
  return config.localAdminEnabled
    && normalizeEmail(email) === config.localAdminEmail
    && String(password || '') === config.localAdminPassword;
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.authJwtSecret, {
    expiresIn: config.authJwtExpiresIn,
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeSecurityAnswer(answer) {
  return String(answer || '').trim().toLowerCase();
}

function normalizeSecurityQuestion(question) {
  return String(question || '').trim().toLowerCase();
}

function validatePasswordStrength(password, fieldName = 'Password') {
  const text = String(password || '');
  if (!PASSWORD_REGEX.test(text)) {
    throw new Error(`${fieldName} must be at least 12 characters and include uppercase, lowercase, number, and special character`);
  }
}

function getResetAttemptState(email) {
  const key = normalizeEmail(email);
  const state = passwordResetAttemptStore.get(key) || { failures: 0, lockedUntil: 0 };
  if (state.lockedUntil && state.lockedUntil <= Date.now()) {
    const cleared = { failures: 0, lockedUntil: 0 };
    passwordResetAttemptStore.set(key, cleared);
    return cleared;
  }
  return state;
}

function ensureResetNotLocked(email) {
  const state = getResetAttemptState(email);
  if (state.lockedUntil > Date.now()) {
    throw new Error('Too many failed reset attempts. Try again in 1 hour.');
  }
}

function markResetFailure(email) {
  const key = normalizeEmail(email);
  const current = getResetAttemptState(email);
  const nextFailures = current.failures + 1;
  const next = {
    failures: nextFailures,
    lockedUntil: nextFailures >= RESET_MAX_ATTEMPTS ? Date.now() + RESET_LOCK_WINDOW_MS : 0,
  };
  passwordResetAttemptStore.set(key, next);
}

function clearResetFailures(email) {
  passwordResetAttemptStore.delete(normalizeEmail(email));
}

function throwResetCredentialError(email) {
  markResetFailure(email);
  throw new Error('Invalid credentials for password reset');
}

function validateRegisterInput({ email, password, age, region, securityQuestion, securityAnswer }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email');
  }

  validatePasswordStrength(password);

  const ageNumber = Number.parseInt(age, 10);
  if (Number.isNaN(ageNumber) || ageNumber < 10 || ageNumber > 100) {
    throw new Error('Age must be between 10 and 100');
  }

  if (!String(region || '').trim()) {
    throw new Error('Region is required');
  }

  if (!String(securityQuestion || '').trim()) {
    throw new Error('Security question is required');
  }

  const normalizedSecurityAnswer = normalizeSecurityAnswer(securityAnswer);
  if (!normalizedSecurityAnswer || normalizedSecurityAnswer.length < 2) {
    throw new Error('Security answer is required');
  }

  return {
    normalizedEmail,
    ageNumber,
    normalizedRegion: String(region).trim(),
    normalizedSecurityQuestion: String(securityQuestion).trim(),
    normalizedSecurityAnswer,
  };
}

export async function registerUser(input) {
  const {
    normalizedEmail,
    ageNumber,
    normalizedRegion,
    normalizedSecurityQuestion,
    normalizedSecurityAnswer,
  } = validateRegisterInput(input);

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Email already registered');
  }

  const { level, score } = assessHikerLevel(input.assessmentAnswers || {});
  const passwordHash = await bcrypt.hash(String(input.password), 10);
  const securityAnswerHash = await bcrypt.hash(normalizedSecurityAnswer, 10);

  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    age: ageNumber,
    region: normalizedRegion,
    securityQuestion: normalizedSecurityQuestion,
    securityAnswerHash,
    level,
    score,
    answers: input.assessmentAnswers || {},
  });

  if (!user) {
    throw new Error('User store unavailable');
  }

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

  if (isLocalAdminCredential(normalizedEmail, password)) {
    const token = signToken(config.localAdminUserId);
    return {
      token,
      user: sanitizeUser(buildLocalAdminUser()),
    };
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

export async function resetPasswordWithSecurityAnswer({ email, securityQuestion, securityAnswer, newPassword }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email');
  }
  validatePasswordStrength(newPassword, 'New password');
  ensureResetNotLocked(normalizedEmail);

  const user = await findUserByEmail(normalizedEmail);
  if (!user || !user.securityAnswerHash) {
    throwResetCredentialError(normalizedEmail);
  }
  if (
    !normalizeSecurityQuestion(securityQuestion)
    || normalizeSecurityQuestion(user.securityQuestion) !== normalizeSecurityQuestion(securityQuestion)
  ) {
    throwResetCredentialError(normalizedEmail);
  }

  const isValidAnswer = await bcrypt.compare(
    normalizeSecurityAnswer(securityAnswer),
    user.securityAnswerHash
  );
  if (!isValidAnswer) {
    throwResetCredentialError(normalizedEmail);
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await updateUserPasswordByEmail({
    email: normalizedEmail,
    passwordHash,
  });
  clearResetFailures(normalizedEmail);

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
  if (config.localAdminEnabled && String(userId) === config.localAdminUserId) {
    return sanitizeUser(buildLocalAdminUser());
  }

  const user = await findUserById(userId);
  return sanitizeUser(user);
}

export async function updateProfileByUserId(userId, { age, region }) {
  const result = await updateOwnProfileById(userId, { age, region });
  if (!result) {
    throw new Error('User store unavailable');
  }
  if (result.error) {
    throw new Error(result.error);
  }
  if (!result.ok || !result.user) {
    throw new Error('User not found');
  }

  return { user: sanitizeUser(result.user) };
}

export async function updateSensitiveProfileByUserId(userId, { email, newPassword, securityQuestion, securityAnswer }) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const wantsEmailUpdate = String(email || '').trim().length > 0;
  const wantsPasswordUpdate = String(newPassword || '').length > 0;
  if (!wantsEmailUpdate && !wantsPasswordUpdate) {
    throw new Error('Email or password update is required');
  }

  if (
    !normalizeSecurityQuestion(securityQuestion)
    || normalizeSecurityQuestion(user.securityQuestion) !== normalizeSecurityQuestion(securityQuestion)
  ) {
    throw new Error('Security question verification failed');
  }

  const userWithSecrets = await findUserByEmail(user.email);
  if (!userWithSecrets?.securityAnswerHash) {
    throw new Error('Security answer verification failed');
  }

  const isValidAnswer = await bcrypt.compare(
    normalizeSecurityAnswer(securityAnswer),
    userWithSecrets.securityAnswerHash
  );
  if (!isValidAnswer) {
    throw new Error('Security answer verification failed');
  }

  let nextPasswordHash = null;
  if (wantsPasswordUpdate) {
    validatePasswordStrength(newPassword, 'New password');
    nextPasswordHash = await bcrypt.hash(String(newPassword), 10);
  }

  let normalizedEmail = '';
  if (wantsEmailUpdate) {
    normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Please provide a valid email');
    }
  }

  const result = await updateOwnCredentialsById(userId, {
    email: wantsEmailUpdate ? normalizedEmail : null,
    passwordHash: nextPasswordHash,
  });

  if (!result) {
    throw new Error('User store unavailable');
  }
  if (result.error) {
    throw new Error(result.error);
  }
  if (!result.ok || !result.user) {
    throw new Error('User not found');
  }

  return { user: sanitizeUser(result.user) };
}
