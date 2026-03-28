import { Router } from 'express';
import { getCommunityReports, postCommunityReport } from '../controllers/communityReportsController.js';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';

const communityReportsRoutes = Router();

communityReportsRoutes.get('/community-reports', getCommunityReports);
communityReportsRoutes.post('/community-reports', requireAuth, postCommunityReport);

export { communityReportsRoutes };
