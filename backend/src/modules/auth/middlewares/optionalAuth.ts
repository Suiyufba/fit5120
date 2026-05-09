import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './requireAuth.js';
import { verifyAuthToken } from '../services/authService.js';

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const userId = verifyAuthToken(token);
  if (userId) req.auth = { userId };
  next();
}
