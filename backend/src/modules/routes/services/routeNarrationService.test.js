import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteIntroductionFallback, extractGeminiText, extractResponseText } from './routeNarrationService.js';

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
    { title: 'Slippery creek crossing', type: 'trail', severity: 'moderate', distanceKm: 0.8 },
  ],
  zoneSummary: { level1Count: 1, level2Count: 2, level3Count: 0 },
};

test('fallback route introduction includes the main route facts', () => {
  const intro = buildRouteIntroductionFallback(sampleRoute);
  assert.match(intro, /12\.4 km/i);
  assert.match(intro, /3 hr 25 min/i);
  assert.match(intro, /moderate walk/i);
  assert.match(intro, /nearby/i);
});

test('response parser prefers output_text when present', () => {
  const text = extractResponseText({ output_text: 'Short route intro.' });
  assert.equal(text, 'Short route intro.');
});

test('response parser falls back to nested content blocks', () => {
  const text = extractResponseText({
    output: [
      {
        content: [
          { type: 'output_text', text: 'Nested route intro.' },
        ],
      },
    ],
  });
  assert.equal(text, 'Nested route intro.');
});

test('gemini parser extracts text from candidate parts', () => {
  const text = extractGeminiText({
    candidates: [
      {
        content: {
          parts: [
            { text: 'Friendly track intro.' },
          ],
        },
      },
    ],
  });
  assert.equal(text, 'Friendly track intro.');
});
