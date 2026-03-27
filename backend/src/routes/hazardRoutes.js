import { Router } from 'express';
import { getRealtimeHazards } from '../controllers/hazardsController.js';

const hazardRoutes = Router();

hazardRoutes.get('/hazards/realtime', getRealtimeHazards);

export { hazardRoutes };
