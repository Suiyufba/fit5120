import test from 'node:test';
import assert from 'node:assert/strict';

// ── Route Handler Integration Tests ────────────────────
// Tests controller input validation and error handling.
// No database needed — just verifies request parsing logic.

import { getCommunityReports, getCommunityReportImage } from '../../controllers/communityReportsController.js';
import { getRealtimeHazards, getHazardHistory } from '../../controllers/hazardsController.js';
import { getHealth } from '../../controllers/healthController.js';
import { getKnowledgeArticles } from '../../controllers/knowledgeController.js';
import { getLocationSearch, getLocationReverse } from '../../controllers/locationController.js';

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, query: {}, params: {}, headers: {}, auth: undefined, get: () => '', protocol: 'http', ...overrides };
}

function mockRes(): any {
  const res: any = { statusCode: 200, body: null, _headers: {} };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.set = (k: string, v: string) => { res._headers[k] = v; return res; };
  res.send = (data: unknown) => { res.body = data; return res; };
  return res;
}

// ── Health ──────────────────────────────────────────────

test('GET /health returns ok', async () => {
  const req = mockReq();
  const res = mockRes();
  getHealth(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).ok, true);
  assert.equal((res.body as any).service, 'hiking-hazard-aggregator');
});

// ── Hazards ────────────────────────────────────────────

test('GET /hazards/realtime rejects invalid bbox', async () => {
  const req = mockReq({ query: { bbox: 'not-a-bbox' } });
  const res = mockRes();
  await getRealtimeHazards(req, res);
  assert.equal(res.statusCode, 400);
  assert.ok((res.body as any).error);
});

test('GET /hazards/realtime rejects invalid layers', async () => {
  const req = mockReq({ query: { bbox: '144,-38,145,-37', layers: 'nuclear,alien' } });
  const res = mockRes();
  await getRealtimeHazards(req, res);
  assert.equal(res.statusCode, 400);
});

test('GET /hazards/history rejects invalid limit', async () => {
  const req = mockReq({ query: { limit: '-5' } });
  const res = mockRes();
  await getHazardHistory(req, res);
  assert.equal(res.statusCode, 400);
});

// ── Knowledge ───────────────────────────────────────────

test('GET /knowledge/articles rejects invalid topic', async () => {
  const req = mockReq({ query: { topic: 'martian-safety' } });
  const res = mockRes();
  await getKnowledgeArticles(req, res);
  assert.equal(res.statusCode, 400);
  assert.ok((res.body as any).error);
});

test('GET /knowledge/articles accepts valid topic', async () => {
  const req = mockReq({ query: { topic: 'weather essentials' } });
  const res = mockRes();
  await getKnowledgeArticles(req, res);
  // May 500 (no DB) or 200 — both acceptable for validation test
  assert.ok(res.statusCode === 200 || res.statusCode === 500);
});

// ── Location ───────────────────────────────────────────

test('GET /locations/search returns empty for short query', async () => {
  const req = mockReq({ query: { q: 'a' } });
  const res = mockRes();
  await getLocationSearch(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual((res.body as any).results, []);
});

// ── Community Reports ──────────────────────────────────

test('GET /community-reports/images/:id returns 404 for missing image', async () => {
  const req = mockReq({ params: { id: 'nonexistent' } });
  const res = mockRes();
  await getCommunityReportImage(req, res);
  assert.equal(res.statusCode, 404);
  assert.ok((res.body as any).error);
});
