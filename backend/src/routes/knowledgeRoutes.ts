// @ts-nocheck
import { Router } from 'express';
import { getKnowledgeArticles } from '../controllers/knowledgeController.js';

const knowledgeRoutes = Router();

knowledgeRoutes.get('/knowledge/articles', getKnowledgeArticles);

export { knowledgeRoutes };
