import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateHikingDurationMin,
  terrainSpeedFactor,
  userPaceFactor,
} from './routeTiming.js';

test('estimate zero distance returns the provided floor', () => {
  assert.equal(estimateHikingDurationMin({ distanceKm: 0 }), 0);
  assert.equal(estimateHikingDurationMin({ distanceKm: 0, floorMin: 42 }), 42);
});

test('estimate without geography falls back to base speed and adds break time', () => {
  const t = estimateHikingDurationMin({
    distanceKm: 10,
    fallbackSpeedKmh: 4.5,
    userLevel: 'intermediate',
  });
  // Baseline moving: 10 / 4.5 * 60 = 133.33 min. Breaks scale with hours.
  assert.ok(t >= 133, `expected >=133 min, got ${t}`);
  assert.ok(t <= 170, `expected <=170 min, got ${t}`);
});

test('steep ascent makes the route take longer than flat for equal distance', () => {
  const flat = estimateHikingDurationMin({
    distanceKm: 10,
    geographyProfile: {
      totalAscentM: 60,
      totalDescentM: 60,
      maxSlopePct: 3,
      avgSlopePct: 1.5,
    },
    userLevel: 'intermediate',
  });
  const steep = estimateHikingDurationMin({
    distanceKm: 10,
    geographyProfile: {
      totalAscentM: 900,
      totalDescentM: 900,
      maxSlopePct: 25,
      avgSlopePct: 12,
    },
    userLevel: 'intermediate',
  });
  assert.ok(steep > flat + 40, `expected steep (${steep}) to exceed flat (${flat}) by >40 min`);
});

test('newcomer takes longer than advanced on the same route', () => {
  const opts = {
    distanceKm: 12,
    geographyProfile: {
      totalAscentM: 400,
      totalDescentM: 380,
      maxSlopePct: 14,
      avgSlopePct: 8,
    },
  };
  const newcomer = estimateHikingDurationMin({ ...opts, userLevel: 'newcomer' });
  const advanced = estimateHikingDurationMin({ ...opts, userLevel: 'advanced' });
  assert.ok(newcomer > advanced + 10, `newcomer ${newcomer} should be >10min above advanced ${advanced}`);
});

test('rough terrain adds time vs compacted path', () => {
  const base = {
    distanceKm: 8,
    userLevel: 'intermediate',
    geographyProfile: {
      totalAscentM: 200,
      totalDescentM: 200,
      maxSlopePct: 8,
      avgSlopePct: 4,
      surfaceType: 'compacted',
      trailCondition: 'good',
    },
  };
  const compacted = estimateHikingDurationMin(base);
  const rocky = estimateHikingDurationMin({
    ...base,
    geographyProfile: {
      ...base.geographyProfile,
      surfaceType: 'rock',
      trailCondition: 'bad',
    },
  });
  assert.ok(rocky > compacted, `rocky ${rocky} should exceed compacted ${compacted}`);
});

test('estimate always respects the provided floor (e.g. OSRM raw duration)', () => {
  const t = estimateHikingDurationMin({
    distanceKm: 5,
    userLevel: 'advanced',
    floorMin: 999,
  });
  assert.ok(t >= 999);
});

test('terrainSpeedFactor is bounded and surfaces multiply with condition', () => {
  const bound = terrainSpeedFactor('mud', 'horrible');
  assert.ok(bound <= 1.6 + 1e-6);
  assert.ok(bound >= 1.0);
  const neutral = terrainSpeedFactor('unknown', 'unknown');
  assert.equal(neutral, 1.0);
});

test('userPaceFactor honours the three standard levels', () => {
  assert.ok(userPaceFactor('advanced') < 1);
  assert.equal(userPaceFactor('intermediate'), 1);
  assert.ok(userPaceFactor('newcomer') > 1);
  assert.ok(userPaceFactor('unknown-label') > 1);
});
