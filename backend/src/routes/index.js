import { Router } from 'express';
import { hazardRoutes } from './hazardRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { authRoutes } from './authRoutes.js';
import { routePlannerRoutes } from './routePlannerRoutes.js';
import { knowledgeRoutes } from './knowledgeRoutes.js';
import { communityReportsRoutes } from './communityReportsRoutes.js';
import { adminRoutes } from './adminRoutes.js';
import { locationRoutes } from './locationRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(hazardRoutes);
apiRouter.use(authRoutes);
apiRouter.use(routePlannerRoutes);
apiRouter.use(knowledgeRoutes);
apiRouter.use(communityReportsRoutes);
apiRouter.use(adminRoutes);
apiRouter.use(locationRoutes);

export { apiRouter };
