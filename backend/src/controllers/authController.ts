import type { Response } from 'express';
import { AUTH_COOKIE_NAME, type AuthenticatedRequest } from '../modules/auth/middlewares/requireAuth.js';
import {
  getProfileByUserId,
  loginUser,
  registerUser,
  resetPasswordWithSecurityAnswer,
  updateProfileByUserId,
  updateSensitiveProfileByUserId
} from '../modules/auth/services/authService.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  });
}

function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await registerUser({
      email: req.body?.email,
      password: req.body?.password,
      age: req.body?.age,
      region: req.body?.region,
      securityQuestion: req.body?.securityQuestion,
      securityAnswer: req.body?.securityAnswer,
      assessmentAnswers: req.body?.assessmentAnswers || {},
    });
    setAuthCookie(res, result.token);
    res.status(201).json({ user: result.user });
  } catch (error) {
    const isConflict = error.message === 'Email already registered';
    res.status(isConflict ? 409 : 400).json({ error: error.message || 'Failed to register' });
  }
}

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await loginUser({
      email: req.body?.email,
      password: req.body?.password,
    });
    setAuthCookie(res, result.token);
    res.json({ user: result.user });
  } catch (error) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await getProfileByUserId(req.auth.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
  }
}

export async function resetPasswordBySecurityAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await resetPasswordWithSecurityAnswer({
      email: req.body?.email,
      securityQuestion: req.body?.securityQuestion,
      securityAnswer: req.body?.securityAnswer,
      newPassword: req.body?.newPassword,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to reset password' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await updateProfileByUserId(req.auth.userId, {
      age: req.body?.age,
      region: req.body?.region,
    });
    res.json(result);
  } catch (error) {
    const message = error.message || 'Failed to update profile';
    const status = message === 'User not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export async function updateSensitiveProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await updateSensitiveProfileByUserId(req.auth.userId, {
      email: req.body?.email,
      newPassword: req.body?.newPassword,
      securityQuestion: req.body?.securityQuestion,
      securityAnswer: req.body?.securityAnswer,
    });
    res.json(result);
  } catch (error) {
    const message = error.message || 'Failed to update credentials';
    const status = message === 'User not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
}
