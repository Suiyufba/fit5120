import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
  clearRoutePlanHistoryItems,
  deleteRoutePlanHistoryItem,
  getRoutePlanHistory,
  postPlanRoute
} from '../controllers/routePlannerController.js';
import { optionalAuth } from '../modules/auth/middlewares/optionalAuth.js';
import type { AuthenticatedRequest } from '../modules/auth/middlewares/requireAuth.js';

const routePlannerRoutes = Router();

/**
 * Route planning calls external APIs (ORS, elevation, AI narration) and writes
 * plan history. Authenticated users are bucketed by account; anonymous users
 * fall back to an IPv6-safe IP subnet key. Do not trust X-Plan-Session-Id for
 * rate limiting because clients can rotate it.
 */
const planRouteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many route plan requests. Please wait a moment.' },
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.auth?.userId) return `user:${authReq.auth.userId}`;
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
});

routePlannerRoutes.post('/routes/plan', optionalAuth, planRouteLimiter, postPlanRoute);
routePlannerRoutes.get('/routes/history', optionalAuth, getRoutePlanHistory);
routePlannerRoutes.delete('/routes/history', optionalAuth, clearRoutePlanHistoryItems);
routePlannerRoutes.delete('/routes/history/:id', optionalAuth, deleteRoutePlanHistoryItem);

export { routePlannerRoutes };
