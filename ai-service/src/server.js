import dotenv from 'dotenv';
import express from 'express';
import { generateRouteIntroduction } from './routeNarrationService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || process.env.AI_SERVICE_PORT || 8090);
const authToken = String(process.env.AI_SERVICE_AUTH_TOKEN || '').trim();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-service' });
});

app.post('/v1/route-introduction', async (req, res) => {
  try {
    if (authToken) {
      const provided = String(req.header('x-ai-service-token') || '').trim();
      if (!provided || provided !== authToken) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const route = req.body?.route;
    if (!route || typeof route !== 'object') {
      return res.status(400).json({ error: 'Invalid request body: route is required' });
    }

    const intro = await generateRouteIntroduction(route);
    return res.json({ intro });
  } catch (error) {
    console.error('Route introduction generation failed:', error?.message || error);
    return res.status(500).json({ error: 'Failed to generate route introduction' });
  }
});

app.listen(port, () => {
  console.log(`[ai-service] listening on :${port}`);
});
