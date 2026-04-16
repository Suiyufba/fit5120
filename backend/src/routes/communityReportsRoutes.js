import { Router } from 'express';
import { getCommunityReports, postCommunityReport } from '../controllers/communityReportsController.js';

const communityReportsRoutes = Router();

communityReportsRoutes.get('/community-reports', getCommunityReports);
communityReportsRoutes.post('/community-reports', postCommunityReport);

export { communityReportsRoutes };
