import { Router } from 'express';
import { hazardRoutes } from './hazardRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { authRoutes } from './authRoutes.js';
import { routePlannerRoutes } from './routePlannerRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(hazardRoutes);
apiRouter.use(authRoutes);
apiRouter.use(routePlannerRoutes);

export { apiRouter };
