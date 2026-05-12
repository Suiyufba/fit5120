import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getCommunityReports,
  postCommunityReport,
  postCommunityReportImage,
  getCommunityReportImage,
} from '../controllers/communityReportsController.js';

const communityReportsRoutes = Router();

/**
 * Report creation writes to the database. Limit anonymous submissions to
 * reduce spam and storage abuse.
 */
const reportCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many report submissions. Please wait a moment.' },
});

/**
 * Image uploads are heavier (base64-encoded blobs). A stricter limit
 * prevents bandwidth/storage saturation.
 */
const imageUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many image uploads. Please wait a moment.' },
});

communityReportsRoutes.get('/community-reports', getCommunityReports);
communityReportsRoutes.post('/community-reports', reportCreateLimiter, postCommunityReport);
communityReportsRoutes.post('/community-reports/images', imageUploadLimiter, postCommunityReportImage);
communityReportsRoutes.get('/community-reports/images/:id', getCommunityReportImage);

export { communityReportsRoutes };
