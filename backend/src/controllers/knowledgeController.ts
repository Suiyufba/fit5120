// @ts-nocheck
import { fetchKnowledgeArticles } from '../modules/knowledge/repositories/articleRepository.js';

const ALLOWED_TOPICS = new Set([
  'all',
  'general',
  'hazard safety',
  'weather essentials',
  'getting started',
]);

export async function getKnowledgeArticles(req, res) {
  try {
    const rawTopic = String(req.query?.topic || '').trim().toLowerCase();
    if (rawTopic && !ALLOWED_TOPICS.has(rawTopic)) {
      res.status(400).json({
        articles: [],
        error: 'Invalid topic filter',
      });
      return;
    }

    const articles = await fetchKnowledgeArticles({
      topic: rawTopic || null
    });
    res.json({ articles });
  } catch (_error) {
    res.status(500).json({
      articles: [],
      error: 'Failed to load knowledge articles'
    });
  }
}
