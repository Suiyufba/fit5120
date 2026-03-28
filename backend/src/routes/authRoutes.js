import { Router } from 'express';
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

authRoutes.post('/auth/register', register);
authRoutes.post('/auth/login', login);
authRoutes.get('/auth/me', requireAuth, me);
authRoutes.put('/auth/profile', requireAuth, updateProfile);
authRoutes.put('/auth/profile/sensitive', requireAuth, updateSensitiveProfile);
authRoutes.post('/auth/password-reset/security', resetPasswordBySecurityAnswer);

export { authRoutes };
