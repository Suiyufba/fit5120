import { verifyAuthToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
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
