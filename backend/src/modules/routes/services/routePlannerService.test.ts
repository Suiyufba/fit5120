import test from 'node:test';
import assert from 'node:assert/strict';
import { pickDifficultyRouteOptions } from './routePlannerService.js';

function route(overrides = {}) {
  return {
    id: 'route',
    geometry: [
      [-37.8, 144.9],
      [-37.79, 144.91],
    ],
    distanceKm: 8,
    durationMin: 140,
    difficulty: 'Moderate',
    riskScore: 10,
    riskLevel: 'Low',
    goNoGo: 'Go',
    safetyStatus: 'Safe',
    noGoReasons: {},
    explanation: '',
    keyRisks: [],
    zoneSummary: { level1Count: 0, level2Count: 0, level3Count: 0 },
    suggestedPrep: [],
    geographyProfile: {
      totalAscentM: 0,
      totalDescentM: 0,
      maxSlopePct: 0,
      avgSlopePct: 0,
      terrainType: 'trail',
      surfaceType: 'compacted',
      trailCondition: 'good',
      riverCrossingCount: 0,
      cliffExposureCount: 0,
      closureCount: 0,
    },
    scoringBreakdown: {
      burdenScore: 20,
      routeEffort: 20,
    },
    ...overrides,
  };
}

test('route option slots are ordered by overall burden, not raw difficulty label', () => {
  const options = pickDifficultyRouteOptions([
    route({
      id: 'easy-short',
      distanceKm: 6,
      durationMin: 107,
      difficulty: 'Easy',
      riskScore: 8,
      riskLevel: 'Low',
      scoringBreakdown: { burdenScore: 18, routeEffort: 18 },
    }),
    route({
      id: 'misleading-moderate',
      distanceKm: 28.4,
      durationMin: 481,
      difficulty: 'Moderate',
      riskScore: 66,
      riskLevel: 'High',
      scoringBreakdown: { burdenScore: 78, routeEffort: 78 },
    }),
    route({
      id: 'short-hard',
      distanceKm: 8.1,
      durationMin: 142,
      difficulty: 'Hard',
      riskScore: 12,
      riskLevel: 'Low',
      scoringBreakdown: { burdenScore: 34, routeEffort: 42 },
    }),
  ]);

  assert.deepEqual(
    options.map((option) => [option.targetDifficulty, option.id]),
    [
      ['Easy', 'easy-short'],
      ['Moderate', 'short-hard'],
      ['Hard', 'misleading-moderate'],
    ],
  );
});
