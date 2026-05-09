import { Router } from 'express';
import { getHazardHistory, getRealtimeHazards } from '../controllers/hazardsController.js';

const hazardRoutes = Router();

hazardRoutes.get('/hazards/realtime', getRealtimeHazards);
hazardRoutes.get('/hazards/history', getHazardHistory);

export { hazardRoutes };
