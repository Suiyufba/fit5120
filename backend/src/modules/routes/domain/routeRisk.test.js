import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSuggestedPrep, scoreRouteCandidate } from './routeRisk.js';

const baseRoute = {
  id: 'r1',
  geometry: [
    [-37.8, 144.9],
    [-37.7, 145.1]
  ],
  distanceKm: 20,
  durationMin: 300
};

test('scoreRouteCandidate computes weighted scores and risk level', () => {
  const hazards = [
    {
      id: 'h1',
      type: 'fire',
      severity: 'high',
      source: 'VicEmergency',
      title: 'Fire front',
      coordinates: [-37.79, 144.95]
    },
    {
      id: 'h2',
      type: 'heat',
      severity: 'moderate',
      source: 'OpenWeather',
      title: 'Heat warning',
      coordinates: [-37.81, 144.91]
    }
  ];

  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards,
    userLevel: 'newcomer',
    fastestRoute: baseRoute
  });

  assert.equal(typeof scored.riskScore, 'number');
  assert.equal(typeof scored.scoringBreakdown.weightedTotal, 'number');
  assert.ok(['Low', 'Moderate', 'High', 'Extreme'].includes(scored.riskLevel));
  assert.ok(Array.isArray(scored.suggestedPrep));
});

test('newcomer becomes No-Go when extreme hazard is close', () => {
  const hazards = [
    {
      id: 'hx',
      type: 'fire',
      severity: 'extreme',
      source: 'VicEmergency',
      title: 'Extreme fire',
      coordinates: [-37.8, 144.92]
    }
  ];

  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards,
    userLevel: 'newcomer',
    fastestRoute: baseRoute
  });

  assert.equal(scored.goNoGo, 'No-Go');
  assert.ok(scored.keyRisks[0]?.advice);
  assert.equal(scored.keyRisks[0]?.zoneLevel, 1);
  assert.equal(typeof scored.zoneSummary.level1Count, 'number');
});

test('advanced user gets Go for low exposure route', () => {
  const hazards = [
    {
      id: 'hfar',
      type: 'flood',
      severity: 'moderate',
      source: 'OpenWeather',
      title: 'Far rain',
      coordinates: [-36.0, 142.0]
    }
  ];

  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards,
    userLevel: 'advanced',
    fastestRoute: baseRoute
  });

  assert.equal(scored.goNoGo, 'Go');
  assert.ok(scored.riskScore < 80);
});

test('recent hazard has higher influence than stale hazard', () => {
  const nowIso = new Date().toISOString();
  const oldIso = new Date(Date.now() - (1000 * 60 * 60 * 24 * 40)).toISOString();
  const recentHazard = {
    id: 'recent',
    type: 'fire',
    severity: 'high',
    source: 'VicEmergency',
    title: 'Recent hazard',
    updatedAt: nowIso,
    coordinates: [-37.8, 144.92]
  };
  const staleHazard = {
    ...recentHazard,
    id: 'stale',
    updatedAt: oldIso
  };

  const recentScore = scoreRouteCandidate({
    route: baseRoute,
    hazards: [recentHazard],
    userLevel: 'intermediate',
    fastestRoute: baseRoute
  }).scoringBreakdown.hazardScore;

  const staleScore = scoreRouteCandidate({
    route: baseRoute,
    hazards: [staleHazard],
    userLevel: 'intermediate',
    fastestRoute: baseRoute
  }).scoringBreakdown.hazardScore;

  assert.ok(recentScore > staleScore);
});

test('newcomer profile risk is higher than advanced for same route/hazards', () => {
  const hazard = {
    id: 'same',
    type: 'storm',
    severity: 'moderate',
    source: 'OpenWeather',
    title: 'Wind alert',
    updatedAt: new Date().toISOString(),
    coordinates: [-37.79, 144.95]
  };

  const newcomer = scoreRouteCandidate({
    route: baseRoute,
    hazards: [hazard],
    userLevel: 'newcomer',
    fastestRoute: baseRoute
  });
  const advanced = scoreRouteCandidate({
    route: baseRoute,
    hazards: [hazard],
    userLevel: 'advanced',
    fastestRoute: baseRoute
  });

  assert.ok(newcomer.riskScore > advanced.riskScore);
});

test('very long hiking route becomes No-Go even with limited hazard overlap', () => {
  const longRoute = {
    ...baseRoute,
    distanceKm: 120,
    durationMin: 1800
  };

  const scored = scoreRouteCandidate({
    route: longRoute,
    hazards: [],
    userLevel: 'advanced',
    fastestRoute: longRoute
  });

  assert.equal(scored.goNoGo, 'No-Go');
  assert.ok(scored.riskScore >= 65);
  assert.match(scored.explanation, /very long/i);
});

test('no-go routes do not keep a low risk label', () => {
  const longRoute = {
    ...baseRoute,
    distanceKm: 70,
    durationMin: 900
  };

  const scored = scoreRouteCandidate({
    route: longRoute,
    hazards: [],
    userLevel: 'advanced',
    fastestRoute: longRoute,
    geographyProfile: {
      totalAscentM: 50,
      totalDescentM: 50,
      maxSlopePct: 4,
      avgSlopePct: 2,
      terrainType: 'path',
      surfaceType: 'compacted',
      trailCondition: 'good',
      riverCrossingCount: 0,
      cliffExposureCount: 0,
      closureCount: 0,
    }
  });

  assert.equal(scored.goNoGo, 'No-Go');
  assert.ok(['High', 'Extreme'].includes(scored.riskLevel));
  assert.ok(scored.riskScore >= 65);
});

test('suggestedPrep surfaces gaps derived from the user assessment answers', () => {
  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
    userProfile: {
      age: 28,
      region: 'Victoria',
      assessmentAnswers: {
        q_weather: 'a',
        q_injury: 'b',
        q_lost: 'c',
        q_fire: 'a',
      },
    },
    now: new Date('2026-04-18T09:00:00+10:00'),
  });

  const prepText = scored.suggestedPrep.join(' | ');
  assert.match(prepText, /weather-awareness gap/i);
  assert.match(prepText, /injury-response gap/i);
  assert.match(prepText, /navigation gap/i);
});

test('suggestedPrep adds senior-specific advice for 60+ hikers', () => {
  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
    userProfile: { age: 68, region: 'Victoria', assessmentAnswers: {} },
  });
  assert.ok(scored.suggestedPrep.some((tip) => /60\+|senior|medication|trekking poles/i.test(tip)));
});

test('suggestedPrep adds minor-specific advice for under-18 hikers', () => {
  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'newcomer',
    fastestRoute: baseRoute,
    userProfile: { age: 15, region: 'Victoria', assessmentAnswers: {} },
  });
  assert.ok(scored.suggestedPrep.some((tip) => /under-18|guardian|whistle/i.test(tip)));
});

test('suggestedPrep season context switches with the provided date', () => {
  const summer = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'newcomer',
    fastestRoute: baseRoute,
    userProfile: { age: 30, region: 'Victoria', assessmentAnswers: {} },
    now: new Date('2026-01-15T08:00:00+11:00'),
  });
  const winter = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'newcomer',
    fastestRoute: baseRoute,
    userProfile: { age: 30, region: 'Victoria', assessmentAnswers: {} },
    now: new Date('2026-07-15T08:00:00+10:00'),
  });

  assert.ok(summer.suggestedPrep.some((tip) => /summer|start before 7 am|snakes/i.test(tip)));
  assert.ok(winter.suggestedPrep.some((tip) => /winter|daylight|thermal|turn-around by 3 pm/i.test(tip)));
});

test('suggestedPrep flags non-Victorian visitors once with region context', () => {
  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
    userProfile: { age: 34, region: 'Shanghai', assessmentAnswers: {} },
  });
  const match = scored.suggestedPrep.filter((tip) => /Visiting Victoria from/i.test(tip));
  assert.equal(match.length, 1);
  assert.match(match[0], /Shanghai/);
});

test('suggestedPrep sorts highest-priority tips first and respects the cap', () => {
  const scored = scoreRouteCandidate({
    route: { ...baseRoute, distanceKm: 40, durationMin: 600 },
    hazards: [
      { id: 'h', type: 'fire', severity: 'high', source: 'VicEmergency', title: 'Fire', coordinates: [-37.79, 144.95] },
    ],
    userLevel: 'newcomer',
    fastestRoute: baseRoute,
    userProfile: {
      age: 15,
      region: 'NSW',
      assessmentAnswers: { q_weather: 'a', q_injury: 'b', q_lost: 'c', q_fire: 'a' },
    },
    geographyProfile: {
      totalAscentM: 900,
      totalDescentM: 800,
      maxSlopePct: 24,
      avgSlopePct: 10,
      riverCrossingCount: 1,
      cliffExposureCount: 1,
      closureCount: 1,
    },
  });

  assert.ok(scored.suggestedPrep.length <= 7);
  // Closure should always be first because it has the highest priority.
  assert.match(scored.suggestedPrep[0], /Closure on route/i);
});

test('suggestedPrep content varies with difficultyTier (Easy vs Moderate vs Hard)', () => {
  // Use a short/modest route so the generic long-outing advice does not blur
  // the tier-specific comparisons.
  const shortRoute = { ...baseRoute, distanceKm: 6, durationMin: 90 };
  const common = {
    route: shortRoute,
    userLevel: 'intermediate',
    userProfile: { age: 34, region: 'Victoria', assessmentAnswers: {} },
    keyRisks: [],
    riskScore: 40,
    goNoGo: 'Go',
    geographyProfile: null,
    now: new Date('2026-04-18T08:00:00.000Z'),
  };

  const easy = buildSuggestedPrep({ ...common, difficultyTier: 'Easy' });
  const moderate = buildSuggestedPrep({ ...common, difficultyTier: 'Moderate' });
  const hard = buildSuggestedPrep({ ...common, difficultyTier: 'Hard' });

  assert.ok(easy.some((tip) => /Easy route|comfortable walking shoes/i.test(tip)));
  assert.ok(moderate.some((tip) => /Moderate route|pack 2 L water/i.test(tip)));
  assert.ok(hard.some((tip) => /Hard route|turn-around time/i.test(tip)));
  assert.ok(hard.some((tip) => /headlamp|bivvy|trekking poles/i.test(tip)));

  // The three tiers must produce materially different tip sets.
  assert.ok(!easy.some((tip) => /Hard route|Hard-route/.test(tip)));
  assert.ok(!hard.some((tip) => /Easy route: comfortable/.test(tip)));
  assert.ok(!moderate.some((tip) => /Hard-route gear kit/.test(tip)));
});

test('Hard tier surfaces gear and turn-around tips near the top', () => {
  const tips = buildSuggestedPrep({
    route: baseRoute,
    userLevel: 'intermediate',
    userProfile: { age: 34, region: 'Victoria', assessmentAnswers: {} },
    keyRisks: [],
    riskScore: 40,
    goNoGo: 'Go',
    geographyProfile: null,
    difficultyTier: 'Hard',
    now: new Date('2026-04-18T08:00:00.000Z'),
  });

  const head = tips.slice(0, 3).join(' | ');
  assert.match(head, /Hard route: set a firm objective turn-around time/i);
});

test('difficulty label reflects geography: short steep route can still be Hard', () => {
  const shortRoute = {
    ...baseRoute,
    distanceKm: 6,
    durationMin: 180,
  };

  const flat = scoreRouteCandidate({
    route: shortRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: shortRoute,
    geographyProfile: {
      totalAscentM: 40,
      totalDescentM: 40,
      maxSlopePct: 3,
      avgSlopePct: 1,
      surfaceType: 'compacted',
      trailCondition: 'good',
    },
  });

  const steep = scoreRouteCandidate({
    route: shortRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: shortRoute,
    geographyProfile: {
      totalAscentM: 900,
      totalDescentM: 850,
      maxSlopePct: 28,
      avgSlopePct: 16,
      surfaceType: 'rock',
      trailCondition: 'bad',
    },
  });

  assert.equal(flat.difficulty, 'Easy');
  assert.ok(['Moderate', 'Hard'].includes(steep.difficulty));
  assert.notEqual(flat.difficulty, steep.difficulty);
});

test('geography profile raises risk when route has steep slopes and closures', () => {
  const flat = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
    geographyProfile: {
      totalAscentM: 120,
      totalDescentM: 120,
      maxSlopePct: 8,
      avgSlopePct: 4,
      terrainType: 'path',
      surfaceType: 'compacted',
      trailCondition: 'good',
      riverCrossingCount: 0,
      cliffExposureCount: 0,
      closureCount: 0,
    }
  });

  const steep = scoreRouteCandidate({
    route: baseRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
    geographyProfile: {
      totalAscentM: 1200,
      totalDescentM: 900,
      maxSlopePct: 32,
      avgSlopePct: 18,
      terrainType: 'steps',
      surfaceType: 'rock',
      trailCondition: 'bad',
      riverCrossingCount: 2,
      cliffExposureCount: 2,
      closureCount: 1,
    }
  });

  assert.ok(steep.riskScore > flat.riskScore);
  assert.equal(steep.goNoGo, 'No-Go');
});
