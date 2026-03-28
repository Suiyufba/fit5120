import { listUsers, deleteUserById } from '../modules/auth/repositories/userRepository.js';
import {
  createManualHazard,
  listManualHazards,
  archiveManualHazard,
  updateManualHazard,
} from '../modules/hazards/repositories/manualHazardRepository.js';
import { listCommunityReports, deleteCommunityReportById } from '../modules/communityReports/repositories/communityReportRepository.js';
import {
  listKnowledgeArticlesAdmin,
  createKnowledgeArticleAdmin,
  updateKnowledgeArticleAdmin,
  deleteKnowledgeArticleAdmin,
} from '../modules/knowledge/repositories/articleRepository.js';

export async function getAdminOverview(req, res) {
  try {
    const [users, reportsPayload, manualHazards, articles] = await Promise.all([
      listUsers({ limit: 500 }),
      listCommunityReports(500),
      listManualHazards({ includeInactive: false }),
      listKnowledgeArticlesAdmin({ limit: 500 }),
    ]);

    res.json({
      counts: {
        users: users.length,
        communityReports: reportsPayload.reports.length,
        manualRisks: manualHazards.length,
        knowledgeArticles: articles.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load admin overview' });
  }
}

export async function getAdminManualRisks(req, res) {
  try {
    const risks = await listManualHazards({ includeInactive: req.query.includeInactive === 'true' });
    res.json({ risks });
  } catch (error) {
    res.status(500).json({ risks: [], error: error.message || 'Failed to load manual risks' });
  }
}

export async function createAdminManualRisk(req, res) {
  try {
    const result = await createManualHazard({
      ...req.body,
      createdBy: req.auth?.email || 'admin',
      source: req.body?.source || 'Admin Dashboard',
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json({ risk: result.hazard });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create manual risk' });
  }
}

export async function archiveAdminManualRisk(req, res) {
  try {
    const result = await archiveManualHazard(req.params.id);
    if (!result.ok) {
      res.status(404).json({ error: 'Manual risk not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to archive manual risk' });
  }
}

export async function updateAdminManualRisk(req, res) {
  try {
    const result = await updateManualHazard(req.params.id, {
      ...req.body,
      source: req.body?.source || 'Admin Dashboard',
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    if (!result.ok) {
      res.status(404).json({ error: 'Manual risk not found' });
      return;
    }
    res.json({ risk: result.hazard });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update manual risk' });
  }
}

export async function getAdminCommunityReports(req, res) {
  try {
    const payload = await listCommunityReports(500);
    res.json({ reports: payload.reports });
  } catch (error) {
    res.status(500).json({ reports: [], error: error.message || 'Failed to load community reports' });
  }
}

export async function deleteAdminCommunityReport(req, res) {
  try {
    const result = await deleteCommunityReportById(req.params.id);
    if (!result.ok) {
      res.status(404).json({ error: 'Community report not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete community report' });
  }
}

export async function getAdminUsers(req, res) {
  try {
    const users = await listUsers({ limit: 500 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ users: [], error: error.message || 'Failed to load users' });
  }
}

export async function deleteAdminUser(req, res) {
  try {
    const ok = await deleteUserById(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
}

export async function getAdminKnowledgeArticles(req, res) {
  try {
    const articles = await listKnowledgeArticlesAdmin({ limit: 500 });
    res.json({ articles });
  } catch (error) {
    res.status(500).json({ articles: [], error: error.message || 'Failed to load knowledge articles' });
  }
}

export async function createAdminKnowledgeArticle(req, res) {
  try {
    const result = await createKnowledgeArticleAdmin(req.body || {});
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json({ id: result.id });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create knowledge article' });
  }
}

export async function updateAdminKnowledgeArticle(req, res) {
  try {
    const result = await updateKnowledgeArticleAdmin(req.params.id, req.body || {});
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    if (!result.ok) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update knowledge article' });
  }
}

export async function deleteAdminKnowledgeArticle(req, res) {
  try {
    const ok = await deleteKnowledgeArticleAdmin(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete knowledge article' });
  }
}
