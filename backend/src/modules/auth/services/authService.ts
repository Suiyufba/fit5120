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
  updateUserPasswordByEmail,
} from '../repositories/userRepository.js';
import type { UserLevel } from 'hikeshield-shared';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
const RESET_MAX_ATTEMPTS = 3;
const RESET_LOCK_WINDOW_MS = 60 * 60 * 1000;
const passwordResetAttemptStore = new Map<string, { failures: number; lockedUntil: number }>();

interface DbUser {
  id: string;
  email: string;
  age?: number;
  region: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswerHash?: string;
  experienceLevel: UserLevel;
  assessmentScore?: number;
  assessmentAnswers?: Record<string, unknown>;
  createdAt?: string;
}

interface SanitizedUser {
  id: string;
  email: string;
  age?: number;
  region: string;
  securityQuestion: string;
  experienceLevel: UserLevel;
  assessmentScore?: number;
  createdAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeUser(user: Record<string, any> | null): SanitizedUser | null {
  if (!user) return null;
  return {
    id: String(user.id ?? ''),
    email: String(user.email ?? ''),
    age: Number.isFinite(Number(user.age)) ? Number(user.age) : undefined,
    region: String(user.region ?? ''),
    securityQuestion: String(user.securityQuestion ?? ''),
    experienceLevel: (['newcomer', 'intermediate', 'advanced'].includes(String(user.experienceLevel ?? ''))
      ? String(user.experienceLevel)
      : 'newcomer') as UserLevel,
    assessmentScore: Number.isFinite(Number(user.assessmentScore)) ? Number(user.assessmentScore) : undefined,
    createdAt: user.createdAt ? String(user.createdAt) : undefined,
  };
}

function signToken(userId: string): string {
  return jwt.sign({ sub: String(userId) }, config.authJwtSecret, {
    expiresIn: config.authJwtExpiresIn,
  } as jwt.SignOptions);
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function normalizeSecurityAnswer(answer: string): string {
  return String(answer || '').trim().toLowerCase();
}

function normalizeSecurityQuestion(question: string): string {
  return String(question || '').trim().toLowerCase();
}

function validatePasswordStrength(password: string, fieldName = 'Password'): void {
  const text = String(password || '');
  if (!PASSWORD_REGEX.test(text)) {
    throw new Error(`${fieldName} must be at least 12 characters and include uppercase, lowercase, number, and special character`);
  }
}

interface ResetAttemptState {
  failures: number;
  lockedUntil: number;
}

function getResetAttemptState(email: string): ResetAttemptState {
  const key = normalizeEmail(email);
  const state = passwordResetAttemptStore.get(key) || { failures: 0, lockedUntil: 0 };
  if (state.lockedUntil && state.lockedUntil <= Date.now()) {
    const cleared = { failures: 0, lockedUntil: 0 };
    passwordResetAttemptStore.set(key, cleared);
    return cleared;
  }
  return state;
}

function ensureResetNotLocked(email: string): void {
  const state = getResetAttemptState(email);
  if (state.lockedUntil > Date.now()) {
    throw new Error('Too many failed reset attempts. Try again in 1 hour.');
  }
}

function markResetFailure(email: string): void {
  const key = normalizeEmail(email);
  const current = getResetAttemptState(email);
  const nextFailures = current.failures + 1;
  const next: ResetAttemptState = {
    failures: nextFailures,
    lockedUntil: nextFailures >= RESET_MAX_ATTEMPTS ? Date.now() + RESET_LOCK_WINDOW_MS : 0,
  };
  passwordResetAttemptStore.set(key, next);
}

function clearResetFailures(email: string): void {
  passwordResetAttemptStore.delete(normalizeEmail(email));
}

function throwResetCredentialError(email: string): never {
  markResetFailure(email);
  throw new Error('Invalid credentials for password reset');
}

export interface RegisterInput {
  email: string;
  password: string;
  age: number;
  region: string;
  securityQuestion: string;
  securityAnswer: string;
  assessmentAnswers?: unknown;
}

interface ValidatedRegisterInput {
  normalizedEmail: string;
  ageNumber: number;
  normalizedRegion: string;
  normalizedSecurityQuestion: string;
  normalizedSecurityAnswer: string;
}

function validateRegisterInput(input: RegisterInput): ValidatedRegisterInput {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email');
  }

  validatePasswordStrength(input.password);

  const ageNumber = Number.parseInt(String(input.age), 10);
  if (Number.isNaN(ageNumber) || ageNumber < 10 || ageNumber > 100) {
    throw new Error('Age must be between 10 and 100');
  }

  if (!String(input.region || '').trim()) {
    throw new Error('Region is required');
  }

  if (!String(input.securityQuestion || '').trim()) {
    throw new Error('Security question is required');
  }

  const normalizedSecurityAnswer = normalizeSecurityAnswer(input.securityAnswer);
  if (!normalizedSecurityAnswer || normalizedSecurityAnswer.length < 2) {
    throw new Error('Security answer is required');
  }

  return {
    normalizedEmail,
    ageNumber,
    normalizedRegion: String(input.region).trim(),
    normalizedSecurityQuestion: String(input.securityQuestion).trim(),
    normalizedSecurityAnswer,
  };
}

export interface AuthResult {
  token: string;
  user: SanitizedUser;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
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
  } as Parameters<typeof createUser>[0]);

  if (!user) {
    throw new Error('User store unavailable');
  }

  const token = signToken(user.id);
  return {
    token,
    user: sanitizeUser(user)!,
  };
}

export async function loginUser({ email, password }: { email: string; password: string }): Promise<AuthResult> {
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
    user: sanitizeUser(user)!,
  };
}

export interface ResetPasswordInput {
  email: string;
  securityQuestion: string;
  securityAnswer: string;
  newPassword: string;
}

export async function resetPasswordWithSecurityAnswer(input: ResetPasswordInput): Promise<{ ok: boolean }> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please provide a valid email');
  }
  validatePasswordStrength(input.newPassword, 'New password');
  ensureResetNotLocked(normalizedEmail);

  const user = await findUserByEmail(normalizedEmail);
  if (!user || !user.securityAnswerHash) {
    throwResetCredentialError(normalizedEmail);
  }
  if (
    !normalizeSecurityQuestion(input.securityQuestion) ||
    normalizeSecurityQuestion(user.securityQuestion) !== normalizeSecurityQuestion(input.securityQuestion)
  ) {
    throwResetCredentialError(normalizedEmail);
  }

  const isValidAnswer = await bcrypt.compare(
    normalizeSecurityAnswer(input.securityAnswer),
    user.securityAnswerHash,
  );
  if (!isValidAnswer) {
    throwResetCredentialError(normalizedEmail);
  }

  const passwordHash = await bcrypt.hash(String(input.newPassword), 10);
  await updateUserPasswordByEmail({
    email: normalizedEmail,
    passwordHash,
  });
  clearResetFailures(normalizedEmail);

  return { ok: true };
}

export function verifyAuthToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.authJwtSecret) as { sub?: string };
    return payload?.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function getProfileByUserId(userId: string): Promise<SanitizedUser | null> {
  const user = await findUserById(userId);
  return sanitizeUser(user);
}

export interface RouteContext {
  id: string;
  email: string;
  age: number | null;
  region: string;
  experienceLevel: UserLevel;
  assessmentScore: number;
  assessmentAnswers: Record<string, unknown>;
}

export async function getRouteContextByUserId(userId: string): Promise<RouteContext | null> {
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    age: user.age ?? null,
    region: user.region || '',
    experienceLevel: (user.experienceLevel || 'newcomer') as UserLevel,
    assessmentScore: Number(user.assessmentScore || 0),
    assessmentAnswers: (user.assessmentAnswers || {}) as Record<string, unknown>,
  };
}

export async function updateProfileByUserId(
  userId: string,
  { age, region }: { age?: number; region?: string },
): Promise<{ user: SanitizedUser }> {
  const result = await updateOwnProfileById(userId, { age, region });
  if (!result) {
    throw new Error('User store unavailable');
  }
  if (result.error) {
    throw new Error(result.error as string);
  }
  if (!result.ok || !result.user) {
    throw new Error('User not found');
  }

  return { user: sanitizeUser(result.user )! };
}

export async function updateSensitiveProfileByUserId(
  userId: string,
  {
    email,
    newPassword,
    securityQuestion,
    securityAnswer,
  }: {
    email?: string;
    newPassword?: string;
    securityQuestion?: string;
    securityAnswer?: string;
  },
): Promise<{ user: SanitizedUser }> {
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
    !normalizeSecurityQuestion(securityQuestion ?? '') ||
    normalizeSecurityQuestion(user.securityQuestion) !== normalizeSecurityQuestion(securityQuestion ?? '')
  ) {
    throw new Error('Security question verification failed');
  }

  const userWithSecrets = await findUserByEmail(user.email);
  if (!userWithSecrets?.securityAnswerHash) {
    throw new Error('Security answer verification failed');
  }

  const isValidAnswer = await bcrypt.compare(
    normalizeSecurityAnswer(securityAnswer ?? ''),
    userWithSecrets.securityAnswerHash,
  );
  if (!isValidAnswer) {
    throw new Error('Security answer verification failed');
  }

  let nextPasswordHash: string | null = null;
  if (wantsPasswordUpdate) {
    validatePasswordStrength(newPassword!, 'New password');
    nextPasswordHash = await bcrypt.hash(String(newPassword), 10);
  }

  let normalizedEmail = '';
  if (wantsEmailUpdate) {
    normalizedEmail = normalizeEmail(email!);
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
    throw new Error(result.error as string);
  }
  if (!result.ok || !result.user) {
    throw new Error('User not found');
  }

  return { user: sanitizeUser(result.user )! };
}
