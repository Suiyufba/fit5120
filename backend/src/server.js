import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { startScheduler } from './modules/hazards/services/hazardAggregator.js';
import { initHazardSnapshotStore } from './infrastructure/db/hazardSnapshotRepository.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use('/api', apiRouter);

async function boot() {
  try {
    const dbReady = await initHazardSnapshotStore();
    if (dbReady) {
      console.log('Postgres snapshot store ready');
    } else {
      console.warn('DATABASE_URL is not set, fallback to in-memory snapshot only');
    }
  } catch (error) {
    console.error('Failed to init Postgres snapshot store:', error.message);
  }

  app.listen(config.port, () => {
    startScheduler();
    console.log(`Hazard backend listening on :${config.port}`);
  });
}

boot();
