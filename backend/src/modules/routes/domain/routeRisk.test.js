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
  durationMin: 40
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
