import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import { generateRouteIntroduction } from './routeNarrationService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || process.env.AI_SERVICE_PORT || 8090);
const authToken = String(process.env.AI_SERVICE_AUTH_TOKEN || '').trim();
const isProduction = process.env.NODE_ENV === 'production';

// Production must have a token set; reject startup if missing.
if (isProduction && !authToken) {
  console.error('FATAL: AI_SERVICE_AUTH_TOKEN is required in production');
  process.exit(1);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Always compares full buffer lengths even when lengths differ.
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Constant-time reject: compare against a zeroed same-length buffer
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length, 0));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-service' });
});

app.post('/v1/route-introduction', async (req, res) => {
  try {
    // In production authToken is guaranteed non-empty (startup check above).
    // In dev/test the route stays open when the token is unset.
    if (authToken) {
      const provided = String(req.header('x-ai-service-token') || '').trim();
      if (!provided || !safeCompare(provided, authToken)) {
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
