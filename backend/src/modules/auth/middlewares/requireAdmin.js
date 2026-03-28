import { config } from '../../../config/index.js';
import { findUserById } from '../repositories/userRepository.js';

export async function requireAdmin(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await findUserById(userId);
    const email = String(user?.email || '').toLowerCase();
    if (!email || !config.adminEmails.includes(email)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.auth = { ...req.auth, email };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
}
