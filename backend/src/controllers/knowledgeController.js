import { fetchKnowledgeArticles } from '../modules/knowledge/repositories/articleRepository.js';

export async function getKnowledgeArticles(req, res) {
  try {
    const articles = await fetchKnowledgeArticles({
      topic: req.query?.topic
    });
    res.json({ articles });
  } catch (error) {
    res.status(500).json({
      articles: [],
      error: error.message || 'Failed to load knowledge articles'
    });
  }
}
