import type { Response, NextFunction } from 'express';
import { getAuthTokenFromRequest, type AuthenticatedRequest } from './requireAuth.js';
import { verifyAuthToken } from '../services/authService.js';

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const userId = verifyAuthToken(getAuthTokenFromRequest(req));
  if (userId) req.auth = { userId };
  next();
}
