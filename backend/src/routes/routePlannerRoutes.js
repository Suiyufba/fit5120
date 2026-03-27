import { Router } from 'express';
import { postPlanRoute } from '../controllers/routePlannerController.js';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';

const routePlannerRoutes = Router();

routePlannerRoutes.post('/routes/plan', requireAuth, postPlanRoute);

export { routePlannerRoutes };
