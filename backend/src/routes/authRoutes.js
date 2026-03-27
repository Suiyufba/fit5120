import { Router } from 'express';
import {
  login,
  me,
  requestPasswordReset,
  requestRegisterVerificationCode,
  resetPassword,
  verifyRegister
} from '../controllers/authController.js';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';

const authRoutes = Router();

authRoutes.post('/auth/register/request-code', requestRegisterVerificationCode);
authRoutes.post('/auth/register/verify', verifyRegister);
authRoutes.post('/auth/login', login);
authRoutes.get('/auth/me', requireAuth, me);
authRoutes.post('/auth/password-reset/request-code', requestPasswordReset);
authRoutes.post('/auth/password-reset/confirm', resetPassword);

export { authRoutes };
