import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  me,
  register,
  resetPasswordBySecurityAnswer,
  updateProfile,
  updateSensitiveProfile
} from '../controllers/authController.js';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';

const authRoutes = Router();

const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
});

authRoutes.post('/auth/register', authWriteLimiter, register);
authRoutes.post('/auth/login', authWriteLimiter, login);
authRoutes.get('/auth/me', requireAuth, me);
authRoutes.put('/auth/profile', requireAuth, updateProfile);
authRoutes.put('/auth/profile/sensitive', requireAuth, updateSensitiveProfile);
authRoutes.post('/auth/password-reset/security', authWriteLimiter, resetPasswordBySecurityAnswer);

export { authRoutes };
