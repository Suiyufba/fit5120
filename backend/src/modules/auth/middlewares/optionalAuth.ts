// @ts-nocheck
import { verifyAuthToken } from '../services/authService.js';

export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const userId = verifyAuthToken(token);
  if (userId) req.auth = { userId };
  next();
}
