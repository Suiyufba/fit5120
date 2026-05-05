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
  assert.equal(scored.safetyStatus, 'Dangerous');
  assert.equal(scored.noGoReasons.hasExtremeTooClose, true);
  assert.ok(scored.keyRisks[0]?.advice);
  assert.equal(scored.keyRisks[0]?.zoneLevel, 1);
  assert.equal(typeof scored.zoneSummary.level1Count, 'number');
});

test('any fire within 1km makes route No-Go regardless of severity', () => {
  const fireHazard = {
    id: 'fire-mod',
    type: 'fire',
    severity: 'moderate',
    source: 'VicEmergency',
    title: 'Moderate bushfire',
    updatedAt: new Date().toISOString(),
    coordinates: [-37.751, 145.001], // ~150m from route midpoint [-37.75, 145.0]
  };

  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [fireHazard],
    userLevel: 'advanced',
    fastestRoute: baseRoute,
  });

  assert.equal(scored.goNoGo, 'No-Go');
  assert.equal(scored.noGoReasons.hasFireTooClose, true);
  assert.ok(scored.riskScore >= 78, `fire within 1km should force risk >= 78, got ${scored.riskScore}`);
});

test('high severity hazard within 500m makes route No-Go', () => {
  const floodHazard = {
    id: 'flood-close',
    type: 'flood',
    severity: 'high',
    source: 'OpenWeather',
    title: 'Flash flood warning',
    updatedAt: new Date().toISOString(),
    coordinates: [-37.7505, 145.0005], // ~60m from route midpoint
  };

  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [floodHazard],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
  });

  assert.equal(scored.goNoGo, 'No-Go');
  assert.equal(scored.noGoReasons.hasHighTooClose, true);
});

test('fire beyond 1km with otherwise low risk can still be Go', () => {
  const farFire = {
    id: 'fire-far',
    type: 'fire',
    severity: 'high',
    source: 'VicEmergency',
    title: 'Distant fire',
    updatedAt: new Date().toISOString(),
    coordinates: [-37.5, 144.5], // far from route [-37.8..-37.7, 144.9..145.1]
  };

  const scored = scoreRouteCandidate({
    route: baseRoute,
    hazards: [farFire],
    userLevel: 'intermediate',
    fastestRoute: baseRoute,
    geographyProfile: {
      totalAscentM: 50, totalDescentM: 50, maxSlopePct: 4, avgSlopePct: 2,
      surfaceType: 'compacted', trailCondition: 'good',
      riverCrossingCount: 0, cliffExposureCount: 0, closureCount: 0,
    },
    now: new Date('2026-04-15T02:00:00Z'),
    maxFeelsLike: 22,
    candidateCount: 3,
  });

  // With far fire and good conditions, route can still be Go for intermediate
  assert.equal(scored.goNoGo, 'Go');
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
  assert.equal(scored.safetyStatus, 'Safe');
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
  }).scoringBreakdown.hazardExposure;

  const staleScore = scoreRouteCandidate({
    route: baseRoute,
    hazards: [staleHazard],
    userLevel: 'intermediate',
    fastestRoute: baseRoute
  }).scoringBreakdown.hazardExposure;

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

// ── Three-Layer Model Tests ─────────────────────────────────────

test('computeDayMinutes returns summer sunset after 7pm and winter sunset before 6pm for Melbourne', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeDayMinutes } = __testing_risk__;

  const melbourneLat = -37.81;
  const melbourneLng = 144.96;

  const summerSunset = computeDayMinutes(melbourneLat, melbourneLng, new Date('2026-01-15T05:00:00Z'));
  const winterSunset = computeDayMinutes(melbourneLat, melbourneLng, new Date('2026-07-15T05:00:00Z'));

  assert.ok(summerSunset > 19, `Summer sunset should be after 7pm, got ${summerSunset}`);
  assert.ok(winterSunset < 18, `Winter sunset should be before 6pm, got ${winterSunset}`);
});

test('computeEnvMultiplier is near or below 1.0 for ideal conditions', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeEnvMultiplier } = __testing_risk__;

  const result = computeEnvMultiplier({
    lat: -37.81, lng: 144.96,
    now: new Date('2026-04-15T02:00:00Z'), // 1pm Melbourne, autumn
    durationMin: 120,
    season: 'autumn',
    maxFeelsLike: 22,
  });

  assert.ok(result.multiplier <= 1.0, `ideal conditions should not amplify risk, got ${result.multiplier}`);
  assert.equal(result.seasonAdjust, -0.05);
});

test('computeEnvMultiplier caps at 1.40 for extreme conditions', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeEnvMultiplier } = __testing_risk__;

  const result = computeEnvMultiplier({
    lat: -37.81, lng: 144.96,
    now: new Date('2026-01-15T09:00:00Z'), // 8pm Melbourne, summer
    durationMin: 180,
    season: 'summer',
    maxFeelsLike: 44,
  });

  assert.equal(result.multiplier, 1.40);
  assert.ok(result.sunAdjust > 0.10, 'finishing after sunset should penalize');
  assert.ok(result.tempAdjust > 0.10, 'extreme heat should penalize');
});

test('computeInteractionPenalty adds for fire + storm combo', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing_risk__;

  const result = computeInteractionPenalty({
    hazardTypes: ['fire', 'storm'],
    hazardImpacts: [],
    geographyProfile: {},
    durationMin: 120,
    sunsetHour: 20,
    finishHour: 16,
    maxFeelsLike: 25,
    candidateCount: 2,
  });

  assert.ok(result >= 12, `fire+storm should add >=12, got ${result}`);
});

test('computeInteractionPenalty adds for rain + steep slope', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing_risk__;

  const result = computeInteractionPenalty({
    hazardTypes: ['flood'],
    hazardImpacts: [],
    geographyProfile: { maxSlopePct: 25 },
    durationMin: 120,
    sunsetHour: 20,
    finishHour: 16,
    maxFeelsLike: 25,
    candidateCount: 2,
  });

  assert.ok(result >= 10, `rain+steep should add >=10, got ${result}`);
});

test('computeInteractionPenalty is zero with no interacting conditions', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing_risk__;

  const result = computeInteractionPenalty({
    hazardTypes: ['trail'],
    hazardImpacts: [],
    geographyProfile: { maxSlopePct: 10 },
    durationMin: 120,
    sunsetHour: 20,
    finishHour: 16,
    maxFeelsLike: 22,
    candidateCount: 3,
  });

  assert.equal(result, 0);
});

test('computeInteractionPenalty caps at 30', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing_risk__;

  const result = computeInteractionPenalty({
    hazardTypes: ['fire', 'storm', 'flood', 'heat'],
    hazardImpacts: [
      { hazard: { type: 'fire' }, distanceKm: 0.5 },
      { hazard: { type: 'flood' }, distanceKm: 0.8 },
    ],
    geographyProfile: { maxSlopePct: 25, cliffExposureCount: 1, closureCount: 1 },
    durationMin: 200,
    sunsetHour: 20,
    finishHour: 22,
    maxFeelsLike: 0,
    candidateCount: 1,
  });

  assert.equal(result, 30);
});

test('computeHazardExposure gives higher diversity boost for mixed types', async () => {
  const { __testing_risk__ } = await import('./routeRisk.js');
  const { computeHazardExposure } = __testing_risk__;

  const geometry = [[-37.8, 144.9], [-37.7, 145.1]];

  const sameTypeHazards = [
    { id: 'f1', type: 'fire', severity: 'high', source: 'VicEmergency', title: 'Fire 1',
      updatedAt: new Date().toISOString(), coordinates: [-37.79, 144.95] },
    { id: 'f2', type: 'fire', severity: 'high', source: 'VicEmergency', title: 'Fire 2',
      updatedAt: new Date().toISOString(), coordinates: [-37.78, 144.96] },
  ];
  const diverseHazards = [
    { id: 'f1', type: 'fire', severity: 'high', source: 'VicEmergency', title: 'Fire',
      updatedAt: new Date().toISOString(), coordinates: [-37.79, 144.95] },
    { id: 'fl1', type: 'flood', severity: 'moderate', source: 'OpenWeather', title: 'Flood',
      updatedAt: new Date().toISOString(), coordinates: [-37.78, 144.96] },
  ];

  const sameResult = computeHazardExposure(sameTypeHazards, geometry, new Date());
  const diverseResult = computeHazardExposure(diverseHazards, geometry, new Date());

  assert.ok(diverseResult.diversityBoost > sameResult.diversityBoost,
    `diverse types should get higher diversity boost. same=${sameResult.diversityBoost} diverse=${diverseResult.diversityBoost}`);
});

test('three-layer model: bad conditions score much higher than good conditions', () => {
  const flatRoute = { ...baseRoute, distanceKm: 10, durationMin: 150 };
  const steepRoute = { ...baseRoute, distanceKm: 10, durationMin: 240 };

  const fireHazard = {
    id: 'fire1', type: 'fire', severity: 'high', source: 'VicEmergency',
    title: 'Bushfire', updatedAt: new Date().toISOString(),
    coordinates: [-37.79, 144.95],
  };
  const stormHazard = {
    id: 'storm1', type: 'storm', severity: 'moderate', source: 'OpenWeather',
    title: 'Wind', updatedAt: new Date().toISOString(),
    coordinates: [-37.78, 144.96],
  };

  const badConditions = scoreRouteCandidate({
    route: steepRoute,
    hazards: [fireHazard, stormHazard],
    userLevel: 'newcomer',
    fastestRoute: flatRoute,
    geographyProfile: {
      totalAscentM: 800, totalDescentM: 600, maxSlopePct: 25, avgSlopePct: 12,
      surfaceType: 'rock', trailCondition: 'bad',
      riverCrossingCount: 1, cliffExposureCount: 1, closureCount: 0,
    },
    now: new Date('2026-01-15T09:00:00Z'), // 8pm summer
    maxFeelsLike: 40,
    candidateCount: 2,
  });

  const goodConditions = scoreRouteCandidate({
    route: flatRoute,
    hazards: [],
    userLevel: 'intermediate',
    fastestRoute: flatRoute,
    geographyProfile: {
      totalAscentM: 100, totalDescentM: 100, maxSlopePct: 5, avgSlopePct: 2,
      surfaceType: 'compacted', trailCondition: 'good',
      riverCrossingCount: 0, cliffExposureCount: 0, closureCount: 0,
    },
    now: new Date('2026-04-15T02:00:00Z'), // 1pm autumn
    maxFeelsLike: 22,
    candidateCount: 3,
  });

  assert.ok(badConditions.riskScore > goodConditions.riskScore,
    `bad (${badConditions.riskScore}) should score higher than good (${goodConditions.riskScore})`);
  assert.ok(badConditions.scoringBreakdown.envMultiplier > 1.1,
    `bad envMultiplier should be >1.1, got ${badConditions.scoringBreakdown.envMultiplier}`);
  assert.ok(badConditions.scoringBreakdown.interactionPenalty > 0,
    `should have interaction penalty, got ${badConditions.scoringBreakdown.interactionPenalty}`);
  assert.ok(goodConditions.scoringBreakdown.envMultiplier <= 1.0,
    `good envMultiplier should be <=1.0, got ${goodConditions.scoringBreakdown.envMultiplier}`);
  assert.ok(badConditions.scoringBreakdown.baseRisk > goodConditions.scoringBreakdown.baseRisk,
    `bad baseRisk should exceed good baseRisk`);
});
