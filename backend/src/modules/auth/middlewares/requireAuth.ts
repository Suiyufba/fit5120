import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../services/authService.js';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const userId = verifyAuthToken(token);

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.auth = { userId };
  next();
}
