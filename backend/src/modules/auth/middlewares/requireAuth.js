import { verifyAuthToken } from '../services/authService.js';
import { config } from '../../../config/index.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token && token === config.localAdminToken) {
    req.auth = { userId: 'local-admin', email: 'admin' };
    next();
    return;
  }

  const userId = verifyAuthToken(token);

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.auth = { userId };
  next();
}
