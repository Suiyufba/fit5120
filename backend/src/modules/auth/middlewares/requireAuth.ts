import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../services/authService.js';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string };
}

export const AUTH_COOKIE_NAME = 'hikeshield_auth';

function parseCookieValue(cookieHeader: string | string[] | undefined, name: string): string {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join(';') : String(cookieHeader || '');
  const prefix = `${name}=`;
  for (const part of raw.split(';')) {
    const item = part.trim();
    if (!item.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(item.slice(prefix.length));
    } catch {
      return item.slice(prefix.length);
    }
  }
  return '';
}

export function getAuthTokenFromRequest(req: Request): string {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return bearer || parseCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const userId = verifyAuthToken(getAuthTokenFromRequest(req));

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.auth = { userId };
  next();
}
