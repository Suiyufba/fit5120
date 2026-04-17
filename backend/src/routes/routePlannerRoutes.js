import { Router } from 'express';
import {
  clearRoutePlanHistoryItems,
  deleteRoutePlanHistoryItem,
  getRoutePlanHistory,
  postPlanRoute
} from '../controllers/routePlannerController.js';
import { optionalAuth } from '../modules/auth/middlewares/optionalAuth.js';

const routePlannerRoutes = Router();

routePlannerRoutes.post('/routes/plan', optionalAuth, postPlanRoute);
routePlannerRoutes.get('/routes/history', optionalAuth, getRoutePlanHistory);
routePlannerRoutes.delete('/routes/history', optionalAuth, clearRoutePlanHistoryItems);
routePlannerRoutes.delete('/routes/history/:id', optionalAuth, deleteRoutePlanHistoryItem);

export { routePlannerRoutes };
