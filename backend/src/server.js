import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { startScheduler } from './modules/hazards/services/hazardAggregator.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use('/api', apiRouter);

app.listen(config.port, () => {
  startScheduler();
  console.log(`Hazard backend listening on :${config.port}`);
});
