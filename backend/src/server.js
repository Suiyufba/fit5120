import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { startScheduler } from './modules/hazards/services/hazardAggregator.js';
import { initHazardSnapshotStore } from './infrastructure/db/hazardSnapshotRepository.js';
import { initUserStore } from './modules/auth/repositories/userRepository.js';
import { initKnowledgeArticleStore } from './modules/knowledge/repositories/articleRepository.js';
import { initCommunityReportStore } from './modules/communityReports/repositories/communityReportRepository.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use('/api', apiRouter);

async function boot() {
  try {
    const dbReady = await initHazardSnapshotStore();
    const userStoreReady = await initUserStore();
    const knowledgeReady = await initKnowledgeArticleStore();
    const communityReportStoreReady = await initCommunityReportStore();

    if (dbReady) {
      console.log('Postgres snapshot store ready');
    } else {
      console.warn('DATABASE_URL is not set, fallback to in-memory snapshot only');
    }
    if (userStoreReady) {
      console.log('User auth store ready');
    }
    if (knowledgeReady) {
      console.log('Knowledge article store ready');
    }
    if (communityReportStoreReady) {
      console.log('Community report store ready');
    } else {
      console.warn('DATABASE_URL is not set, community reports fallback to in-memory');
    }
  } catch (error) {
    console.error('Failed to initialize database stores:', error.message);
  }

  app.listen(config.port, () => {
    startScheduler();
    console.log(`Hazard backend listening on :${config.port}`);
  });
}

boot();
