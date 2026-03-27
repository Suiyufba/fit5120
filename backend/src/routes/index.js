import { Router } from 'express';
import { hazardRoutes } from './hazardRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { authRoutes } from './authRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(hazardRoutes);
apiRouter.use(authRoutes);

export { apiRouter };
