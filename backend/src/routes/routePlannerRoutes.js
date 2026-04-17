import { Router } from 'express';
import { getRoutePlanHistory, postPlanRoute } from '../controllers/routePlannerController.js';
import { optionalAuth } from '../modules/auth/middlewares/optionalAuth.js';

const routePlannerRoutes = Router();

routePlannerRoutes.post('/routes/plan', optionalAuth, postPlanRoute);
routePlannerRoutes.get('/routes/history', optionalAuth, getRoutePlanHistory);

export { routePlannerRoutes };
