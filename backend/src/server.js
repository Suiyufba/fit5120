import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { getHazardsForRequest, startScheduler } from './services/hazardAggregator.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'hiking-hazard-aggregator',
    time: new Date().toISOString(),
    fetchIntervalMs: config.fetchIntervalMs
  });
});

app.get('/api/hazards/realtime', async (req, res) => {
  try {
    const payload = await getHazardsForRequest({
      bboxParam: req.query.bbox,
      layersParam: req.query.layers
    });

    res.json(payload);
  } catch (error) {
    console.error('Hazard endpoint failed:', error.message);
    res.status(500).json({
      hazards: [],
      error: 'Failed to fetch hazards'
    });
  }
});

app.listen(config.port, () => {
  startScheduler();
  console.log(`Hazard backend listening on :${config.port}`);
});
