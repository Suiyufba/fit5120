import { Router } from 'express';
import { requireAuth } from '../modules/auth/middlewares/requireAuth.js';
import { requireAdmin } from '../modules/auth/middlewares/requireAdmin.js';
import {
  getAdminOverview,
  getAdminManualRisks,
  createAdminManualRisk,
  updateAdminManualRisk,
  archiveAdminManualRisk,
  getAdminCommunityReports,
  createAdminCommunityReport,
  updateAdminCommunityReport,
  deleteAdminCommunityReport,
  getAdminUsers,
  deleteAdminUser,
  getAdminKnowledgeArticles,
  createAdminKnowledgeArticle,
  updateAdminKnowledgeArticle,
  deleteAdminKnowledgeArticle,
} from '../controllers/adminController.js';

const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get('/admin/overview', getAdminOverview);

adminRoutes.get('/admin/risks', getAdminManualRisks);
adminRoutes.post('/admin/risks', createAdminManualRisk);
adminRoutes.put('/admin/risks/:id', updateAdminManualRisk);
adminRoutes.delete('/admin/risks/:id', archiveAdminManualRisk);

adminRoutes.get('/admin/community-reports', getAdminCommunityReports);
adminRoutes.post('/admin/community-reports', createAdminCommunityReport);
adminRoutes.put('/admin/community-reports/:id', updateAdminCommunityReport);
adminRoutes.delete('/admin/community-reports/:id', deleteAdminCommunityReport);

adminRoutes.get('/admin/users', getAdminUsers);
adminRoutes.delete('/admin/users/:id', deleteAdminUser);

adminRoutes.get('/admin/knowledge/articles', getAdminKnowledgeArticles);
adminRoutes.post('/admin/knowledge/articles', createAdminKnowledgeArticle);
adminRoutes.put('/admin/knowledge/articles/:id', updateAdminKnowledgeArticle);
adminRoutes.delete('/admin/knowledge/articles/:id', deleteAdminKnowledgeArticle);

export { adminRoutes };
