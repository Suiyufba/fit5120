import { Router } from 'express';
import {
  login,
  me,
  register,
  resetPasswordBySecurityAnswer
} from '../controllers/authController.js';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';

const authRoutes = Router();

authRoutes.post('/auth/register', register);
authRoutes.post('/auth/login', login);
authRoutes.get('/auth/me', requireAuth, me);
authRoutes.post('/auth/password-reset/security', resetPasswordBySecurityAnswer);

export { authRoutes };
