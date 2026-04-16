import { Router } from 'express';
import { postPlanRoute } from '../controllers/routePlannerController.js';

const routePlannerRoutes = Router();

routePlannerRoutes.post('/routes/plan', postPlanRoute);

export { routePlannerRoutes };
