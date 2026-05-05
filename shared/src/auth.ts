import type { UserLevel } from './route.js';

// ── User ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  age: number;
  region: string;
  experienceLevel: UserLevel;
  createdAt: string;
  /** Assessment answers stored at registration; used for personalised prep tips */
  assessmentAnswers?: Record<string, string>;
}

// ── Auth Requests ───────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  age: number;
  region: string;
  securityQuestion: string;
  securityAnswer: string;
  assessmentAnswers: Record<string, string>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
  securityQuestion: string;
  securityAnswer: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  age?: number;
  region?: string;
}

export interface UpdateSensitiveProfileRequest {
  email?: string;
  newPassword?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

// ── Auth Responses ──────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}
