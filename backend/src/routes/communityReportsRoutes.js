import { Router } from 'express';
import {
  getCommunityReports,
  postCommunityReport,
  postCommunityReportImage,
  getCommunityReportImage,
} from '../controllers/communityReportsController.js';

const communityReportsRoutes = Router();

communityReportsRoutes.get('/community-reports', getCommunityReports);
communityReportsRoutes.post('/community-reports', postCommunityReport);
communityReportsRoutes.post('/community-reports/images', postCommunityReportImage);
communityReportsRoutes.get('/community-reports/images/:id', getCommunityReportImage);

export { communityReportsRoutes };
