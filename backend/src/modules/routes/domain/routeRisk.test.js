import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreRouteCandidate } from './routeRisk.js';

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
