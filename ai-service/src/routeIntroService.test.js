import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRouteIntroductionFallback,
  extractGeminiText,
  getRouteIntroProvider,
  normalizeRouteIntroInput,
  validateRouteIntroInput,
} from './routeIntroService.js';

const sampleRoute = {
  distanceKm: 12.4,
  durationMin: 205,
  difficulty: 'Moderate',
  riskLevel: 'Moderate',
  goNoGo: 'Go',
  geographyProfile: {
    totalAscentM: 520,
    maxSlopePct: 21,
    terrainType: 'bush trail',
    surfaceType: 'rocky',
    trailCondition: 'good',
  },
  keyRisks: [
    { title: 'Bushfire watch', type: 'fire', severity: 'high', distanceKm: 1.4 },
  ],
  zoneSummary: { level1Count: 1, level2Count: 2, level3Count: 0 },
};

test('fallback route introduction includes the main route facts', () => {
  const intro = buildRouteIntroductionFallback(sampleRoute);
  assert.match(intro, /12\.4 km/i);
  assert.match(intro, /3 hr 25 min/i);
  assert.match(intro, /moderate walk/i);
});

test('normalizeRouteIntroInput fills safe defaults', () => {
  const normalized = normalizeRouteIntroInput({});
  assert.equal(normalized.distanceKm, 0);
  assert.equal(normalized.durationMin, 0);
  assert.equal(normalized.difficulty, 'Moderate');
});

test('validateRouteIntroInput rejects negative duration', () => {
  const error = validateRouteIntroInput({ distanceKm: 1, durationMin: -1 });
  assert.match(error, /durationMin/i);
});

test('gemini parser extracts text from candidate parts', () => {
  const text = extractGeminiText({
    candidates: [
      {
        content: {
          parts: [{ text: 'Friendly track intro.' }],
        },
      },
    ],
  });
  assert.equal(text, 'Friendly track intro.');
});

test('provider selection prefers explicit local-model setting', () => {
  const provider = getRouteIntroProvider({
    provider: 'local-model',
    localModelAdapterPath: '',
    apiKey: 'gemini-key',
  });
  assert.equal(provider, 'local-model');
});

test('provider selection falls back to local-model when adapter path is set', () => {
  const provider = getRouteIntroProvider({
    provider: 'auto',
    localModelAdapterPath: '/tmp/adapter',
    apiKey: 'gemini-key',
  });
  assert.equal(provider, 'local-model');
});

test('provider selection falls back to gemini when key is available', () => {
  const provider = getRouteIntroProvider({
    provider: 'auto',
    localModelAdapterPath: '',
    apiKey: 'gemini-key',
  });
  assert.equal(provider, 'gemini');
});
