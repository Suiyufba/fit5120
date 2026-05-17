import http from 'node:http';
import { generateRouteIntroduction } from './routeIntroService.js';

const port = Number.parseInt(process.env.PORT || '8090', 10) || 8090;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'hikeshield-ai-service',
      time: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/route-intro') {
    try {
      const payload = await readJsonBody(req);
      const result = await generateRouteIntroduction(payload);
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      const statusCode = error.message?.includes('must be') || error.message?.includes('Invalid JSON')
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: error.message || 'Failed to generate route intro',
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(port, () => {
  console.log(`HikeShield AI service listening on :${port}`);
});
