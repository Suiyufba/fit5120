import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';

const authRoutes = Router();

authRoutes.post('/auth/register', register);
authRoutes.post('/auth/login', login);
authRoutes.get('/auth/me', requireAuth, me);

export { authRoutes };
