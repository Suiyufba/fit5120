import { Router } from 'express';
import { hazardRoutes } from './hazardRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { authRoutes } from './authRoutes.js';
import { routePlannerRoutes } from './routePlannerRoutes.js';
import { knowledgeRoutes } from './knowledgeRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(hazardRoutes);
apiRouter.use(authRoutes);
apiRouter.use(routePlannerRoutes);
apiRouter.use(knowledgeRoutes);

export { apiRouter };
