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

function normalizeSecurityAnswer(answer) {
  return String(answer || '').trim().toLowerCase();
}

function validateRegisterInput({ email, password, age, region, securityQuestion, securityAnswer }) {
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
  if (!newPassword || String(newPassword).length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user || !user.securityAnswerHash) {
    throw new Error('Invalid credentials for password reset');
  }
  if (!String(securityQuestion || '').trim() || user.securityQuestion !== String(securityQuestion).trim()) {
    throw new Error('Invalid credentials for password reset');
  }

  const isValidAnswer = await bcrypt.compare(
    normalizeSecurityAnswer(securityAnswer),
    user.securityAnswerHash
  );
  if (!isValidAnswer) {
    throw new Error('Invalid credentials for password reset');
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await updateUserPasswordByEmail({
    email: normalizedEmail,
    passwordHash,
  });

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
