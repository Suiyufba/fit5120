# Three-Layer Risk Scoring Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat weighted-sum risk model with a three-layer architecture (Base Risk × Environmental Multiplier + Interaction Penalty), fix 4 defects, and add 5 new scoring factors.

**Architecture:** The core scoring logic in `routeRisk.js` is rewritten into three composable layers. External API contracts (`scoreRouteCandidate` signature, `toRoutePayload` fields) remain backward-compatible. `routePlannerService.js` gains a small change to extract temperature data from hazards and pass it through. Tests are rewritten to cover each layer independently.

**Tech Stack:** Node.js 22, vanilla JS (no new dependencies), node:test runner

---

## File Structure

| File | Role |
|------|------|
| `backend/src/modules/routes/domain/routeRisk.js` | Core: all scoring functions, sunset calc, interaction rules |
| `backend/src/modules/routes/services/routePlannerService.js` | Orchestration: extract maxFeelsLike from hazards, pass to scorer |
| `backend/src/modules/routes/domain/routeRisk.test.js` | Tests: layer-by-layer coverage + integration |

No new files created. `routeTiming.js`, `routeGeographyService.js`, frontend — no changes.

---

### Task 1: Fix recencyFactor to use passed `now` parameter

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.js:108-120`

- [ ] **Step 1: Change recencyFactor signature and body**

Change lines 108-120 from:

```js
function recencyFactor(updatedAt) {
  const ts = Date.parse(updatedAt || '');
  if (Number.isNaN(ts)) return 0.6;

  const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
  // ... rest unchanged
```

To:

```js
function recencyFactor(updatedAt, now = new Date()) {
  const ts = Date.parse(updatedAt || '');
  if (Number.isNaN(ts)) return 0.6;

  const referenceTime = now instanceof Date ? now.getTime() : Date.parse(now || '');
  const nowMs = Number.isFinite(referenceTime) ? referenceTime : Date.now();
  const ageHours = Math.max(0, (nowMs - ts) / (1000 * 60 * 60));
  // ... rest unchanged (the if/else chain stays exactly the same)
```

- [ ] **Step 2: Update toHazardImpact to pass `now` through**

Change line 101-106 to accept and forward `now`:

```js
function toHazardImpact(hazard, distanceKm, now) {
  const base = SEVERITY_BASE[hazard.severity] ?? 20;
  const factor = TYPE_FACTOR[hazard.type] ?? TYPE_FACTOR.other;
  const impact = base * distanceFactor(distanceKm) * factor * recencyFactor(hazard.updatedAt, now);
  return clamp(impact);
}
```

- [ ] **Step 3: Update all callers of toHazardImpact**

In `topImpactAverage` (line 122-150): add `now` parameter and pass to `toHazardImpact`:

```js
function topImpactAverage(hazards, geometry, filterFn, now) {
  // ...
  impact: toHazardImpact(hazard, distanceKm, now)
  // ...
}
```

In `collectCoverageImpacts` (line 152-170): same pattern:

```js
function collectCoverageImpacts(hazards, geometry, filterFn = () => true, now) {
  // ...
  impact: toHazardImpact(hazard, distanceKm, now)
  // ...
}
```

- [ ] **Step 4: Update scoreRouteCandidate to pass `now` through**

In `scoreRouteCandidate` (around line 610), update the calls:

```js
const hazardAgg = topImpactAverage(hazards, geometry, () => true, now);
const weatherAgg = topImpactAverage(hazards, geometry, (hazard) => isOpenWeatherHazard(hazard), now);
const coverageImpacts = collectCoverageImpacts(hazards, geometry, undefined, now);
```

- [ ] **Step 5: Run existing tests to confirm no regression**

Run: `cd /Users/junqiliu/Desktop/IT/goHiking/backend && NODE_ENV=test node --test`
Expected: 34 pass (tests that don't depend on time should be unaffected)

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js
git commit -m "fix(route-risk): pass now parameter through recencyFactor chain"
```

---

### Task 2: Add sunset time calculation

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.js` (add new function)

- [ ] **Step 1: Add computeSunsetHour function**

Add after the `seasonFromDate` function (~line 411):

```js
function computeDayMinutes(lat, lng, date) {
  const d = date instanceof Date ? date : new Date(date);
  const janFirst = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - janFirst) / (1000 * 60 * 60 * 24)) + 1;
  const latRad = toRad(lat);
  const declination = toRad(23.45) * Math.sin(toRad((360 / 365) * (dayOfYear - 81)));
  const ha = Math.acos(
    clamp((-Math.sin(toRad(-0.83)) - Math.sin(latRad) * Math.sin(declination))
      / (Math.cos(latRad) * Math.cos(declination)), -1, 1)
  );
  const solarNoonMinutes = 12 * 60 - (lng / 15) * 60;
  const daylightHalfMinutes = (ha / (2 * Math.PI)) * 24 * 60;
  const sunsetMinutes = solarNoonMinutes + daylightHalfMinutes;
  return sunsetMinutes / 60;
}
```

Uses the standard solar geometry formula: declination → hour angle → sunset. The `-0.83°` is the standard solar zenith angle for sunset (accounts for atmospheric refraction and solar disc radius).

- [ ] **Step 2: Write unit test for computeSunsetHour**

Add to test file:

```js
test('computeSunsetHour returns reasonable values for Melbourne in different seasons', async () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeSunsetHour } = __testing__;

  const melbourneLat = -37.81;
  const melbourneLng = 144.96;

  const summerSunset = computeSunsetHour(melbourneLat, melbourneLng, new Date('2026-01-15T05:00:00Z'));
  const winterSunset = computeSunsetHour(melbourneLat, melbourneLng, new Date('2026-07-15T05:00:00Z'));

  assert.ok(summerSunset > 19, `Summer sunset should be after 7pm, got ${summerSunset}`);
  assert.ok(winterSunset < 18, `Winter sunset should be before 6pm, got ${winterSunset}`);
});
```

- [ ] **Step 3: Run test to verify**

Run: `cd /Users/junqiliu/Desktop/IT/goHiking/backend && NODE_ENV=test node --test --test-name-pattern="sunset"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js backend/src/modules/routes/domain/routeRisk.test.js
git commit -m "feat(route-risk): add sunset time calculation for daylight risk"
```

---

### Task 3: Implement Layer 1 — baseRisk scoring functions

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.js` (add new functions, refactor existing)

- [ ] **Step 1: Add computeHazardExposure function**

Add new function that consolidates hazard scoring with type diversity:

```js
function computeHazardExposure(hazards, geometry, now) {
  const allImpacts = hazards
    .map((hazard) => {
      const distanceKm = distanceToRouteKm(hazard.coordinates, geometry);
      return {
        hazard,
        distanceKm,
        impact: toHazardImpact(hazard, distanceKm, now),
      };
    })
    .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= 8 && item.impact > 0)
    .sort((a, b) => b.impact - a.impact);

  const top6 = allImpacts.slice(0, 6);

  if (!top6.length) return { score: 0, impacts: [], diversityBoost: 1 };

  const uniqueTypes = new Set(top6.map((item) => item.hazard.type)).size;
  const diversityBoost = 1 + (uniqueTypes / 6) * 0.35;

  const avg = top6.reduce((sum, item) => sum + item.impact, 0) / top6.length;
  const score = clamp(avg * Math.min(1.65, diversityBoost));

  return { score, impacts: top6, diversityBoost: Number(diversityBoost.toFixed(2)) };
}
```

- [ ] **Step 2: Add computeRouteEffort function**

```js
function computeRouteEffort(route, geographyProfile) {
  const burdenScore = routeBurdenScore(route);
  const ascentScore = clamp((Number(geographyProfile?.totalAscentM || 0) / 1400) * 100);
  const slopeScore = clamp((Number(geographyProfile?.maxSlopePct || 0) / 35) * 100);
  const elevationFatigue = clamp(0.6 * ascentScore + 0.4 * slopeScore);

  return {
    score: clamp(0.55 * burdenScore + 0.45 * elevationFatigue),
    burdenScore: Number(burdenScore.toFixed(1)),
    elevationFatigue: Number(elevationFatigue.toFixed(1)),
  };
}
```

- [ ] **Step 3: Add computeTerrainDanger function**

```js
function computeTerrainDanger(geometry, hazards, geographyProfile, now) {
  const coverageImpacts = collectCoverageImpacts(hazards, geometry, () => true, now);
  const zoneCoverage = coverageZoneScore(coverageImpacts);

  const terrainSurface = terrainPenalty(
    geographyProfile?.surfaceType,
    geographyProfile?.trailCondition,
  );

  const exposureCounts = clamp(
    (Number(geographyProfile?.riverCrossingCount || 0) * 10)
    + (Number(geographyProfile?.cliffExposureCount || 0) * 14)
    + (Number(geographyProfile?.closureCount || 0) * 28),
    0,
    100,
  );

  return {
    score: clamp(0.40 * zoneCoverage + 0.30 * terrainSurface + 0.30 * exposureCounts),
    zoneCoverage: Number(zoneCoverage.toFixed(1)),
    terrainSurface: Number(terrainSurface.toFixed(1)),
    exposureCounts: Number(exposureCounts.toFixed(1)),
    coverageImpacts,
  };
}
```

- [ ] **Step 4: Write Layer 1 unit tests**

```js
test('computeHazardExposure with diverse types scores higher diversity boost', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeHazardExposure } = __testing__;

  const geometry = [[-37.8, 144.9], [-37.7, 145.1]];
  const sameTypeHazards = [
    { id: 'f1', type: 'fire', severity: 'high', source: 'Vic', title: 'Fire 1',
      updatedAt: new Date().toISOString(), coordinates: [-37.79, 144.95] },
    { id: 'f2', type: 'fire', severity: 'high', source: 'Vic', title: 'Fire 2',
      updatedAt: new Date().toISOString(), coordinates: [-37.78, 144.96] },
  ];
  const diverseHazards = [
    { id: 'f1', type: 'fire', severity: 'high', source: 'Vic', title: 'Fire',
      updatedAt: new Date().toISOString(), coordinates: [-37.79, 144.95] },
    { id: 'fl1', type: 'flood', severity: 'moderate', source: 'OW', title: 'Flood',
      updatedAt: new Date().toISOString(), coordinates: [-37.78, 144.96] },
  ];

  const sameResult = computeHazardExposure(sameTypeHazards, geometry, new Date());
  const diverseResult = computeHazardExposure(diverseHazards, geometry, new Date());

  assert.ok(diverseResult.diversityBoost > sameResult.diversityBoost,
    'diverse types should get higher diversity boost');
});
```

- [ ] **Step 5: Run Layer 1 tests**

Run: `NODE_ENV=test node --test --test-name-pattern="computeHazardExposure|computeRouteEffort|computeTerrainDanger"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js backend/src/modules/routes/domain/routeRisk.test.js
git commit -m "feat(route-risk): add Layer 1 base risk scoring functions"
```

---

### Task 4: Implement Layer 2 — environmental multiplier

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.js` (add computeEnvMultiplier)

- [ ] **Step 1: Add computeEnvMultiplier function**

```js
function computeEnvMultiplier({ lat, lng, now, durationMin, season, maxFeelsLike }) {
  const sunsetHour = computeDayMinutes(lat, lng, now);
  const nowHour = now instanceof Date
    ? now.getHours() + now.getMinutes() / 60
    : new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const finishHour = nowHour + (durationMin || 0) / 60;
  const daylightGap = finishHour - sunsetHour;

  let sunAdjust = 0;
  if (daylightGap < -2) sunAdjust = -0.10;
  else if (daylightGap < 0) sunAdjust = 0;
  else if (daylightGap < 0.5) sunAdjust = 0.08;
  else if (daylightGap < 1) sunAdjust = 0.15;
  else sunAdjust = 0.22;

  const seasonMap = { summer: 0.10, autumn: -0.05, winter: 0.06, spring: 0.00 };
  const seasonAdjust = seasonMap[season] || 0;

  let tempAdjust = 0;
  const t = Number(maxFeelsLike);
  if (Number.isFinite(t)) {
    if (t < 5) tempAdjust = 0.06;
    else if (t < 30) tempAdjust = 0;
    else if (t < 35) tempAdjust = 0.04;
    else if (t < 38) tempAdjust = 0.08;
    else if (t < 42) tempAdjust = 0.14;
    else tempAdjust = 0.20;
  }

  const multiplier = clamp(1.0 + sunAdjust + seasonAdjust + tempAdjust, 0.70, 1.40);

  return {
    multiplier: Number(multiplier.toFixed(2)),
    sunAdjust: Number(sunAdjust.toFixed(2)),
    seasonAdjust: Number(seasonAdjust.toFixed(2)),
    tempAdjust: Number(tempAdjust.toFixed(2)),
    sunsetHour: Number(sunsetHour.toFixed(1)),
    finishHour: Number(finishHour.toFixed(1)),
  };
}
```

- [ ] **Step 2: Write Layer 2 unit tests**

```js
test('envMultiplier is lowest for ideal conditions (autumn day, mild temp)', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeEnvMultiplier } = __testing__;

  const result = computeEnvMultiplier({
    lat: -37.81, lng: 144.96,
    now: new Date('2026-04-15T02:00:00Z'), // 1pm Melbourne, autumn
    durationMin: 120,
    season: 'autumn',
    maxFeelsLike: 22,
  });

  assert.ok(result.multiplier <= 1.0, `ideal conditions should not amplify risk, got ${result.multiplier}`);
});

test('envMultiplier caps at 1.40 for worst conditions (summer night, extreme heat)', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeEnvMultiplier } = __testing__;

  const result = computeEnvMultiplier({
    lat: -37.81, lng: 144.96,
    now: new Date('2026-01-15T09:00:00Z'), // 8pm Melbourne, summer
    durationMin: 180,
    season: 'summer',
    maxFeelsLike: 44,
  });

  assert.equal(result.multiplier, 1.40, 'should cap at 1.40');
  assert.ok(result.sunAdjust > 0.15, 'finishing well after sunset should penalize');
  assert.ok(result.tempAdjust >= 0.20, 'extreme heat should penalize');
});
```

- [ ] **Step 3: Run Layer 2 tests**

Run: `NODE_ENV=test node --test --test-name-pattern="envMultiplier"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js backend/src/modules/routes/domain/routeRisk.test.js
git commit -m "feat(route-risk): add Layer 2 environmental multiplier"
```

---

### Task 5: Implement Layer 3 — interaction penalty

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.js` (add computeInteractionPenalty)

- [ ] **Step 1: Add computeInteractionPenalty function**

```js
function computeInteractionPenalty({
  hazardTypes,
  hazardImpacts,
  geographyProfile,
  durationMin,
  sunsetHour,
  finishHour,
  maxFeelsLike,
  candidateCount,
}) {
  let penalty = 0;
  const types = new Set(hazardTypes);

  const hasFire = types.has('fire');
  const hasStorm = types.has('storm');
  const hasFlood = types.has('flood');
  const hasHeat = types.has('heat');
  const maxSlope = Number(geographyProfile?.maxSlopePct || 0);
  const cliffCount = Number(geographyProfile?.cliffExposureCount || 0);
  const riverCount = Number(geographyProfile?.riverCrossingCount || 0);
  const closureCount = Number(geographyProfile?.closureCount || 0);
  const finishAfterSunset = finishHour > sunsetHour;

  if (hasFire && hasStorm) penalty += 12;
  if ((hasFlood || hasStorm) && maxSlope >= 22) penalty += 10;
  if (hasHeat && durationMin >= 180) penalty += 8;
  if (closureCount > 0 && candidateCount <= 1) penalty += 10;
  if (hasFire && hazardImpacts.some((item) => item.hazard.type === 'fire' && item.distanceKm <= 1)) penalty += 8;
  if (types.size >= 2) {
    const nearHazards = hazardImpacts.filter((item) => item.distanceKm <= 1);
    const nearTypes = new Set(nearHazards.map((item) => item.hazard.type));
    if (nearTypes.size >= 2) penalty += 6;
  }
  if (finishAfterSunset && (cliffCount > 0 || riverCount > 0)) penalty += 8;
  if (Number.isFinite(maxFeelsLike) && maxFeelsLike < 2 && (hasFlood || hasStorm)) penalty += 6;

  return clamp(penalty, 0, 30);
}
```

- [ ] **Step 2: Write Layer 3 unit tests**

```js
test('interaction penalty adds for fire + wind combo', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing__;

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

  assert.ok(result >= 12, `fire+storm should add at least 12, got ${result}`);
});

test('interaction penalty adds for rain + steep slope', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing__;

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

  assert.ok(result >= 10, `rain+steep should add at least 10, got ${result}`);
});

test('interaction penalty is zero for no interacting conditions', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing__;

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

test('interaction penalty caps at 30', () => {
  const { __testing__ } = await import('./routeRisk.js');
  const { computeInteractionPenalty } = __testing__;

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
```

- [ ] **Step 3: Run Layer 3 tests**

Run: `NODE_ENV=test node --test --test-name-pattern="interaction"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js backend/src/modules/routes/domain/routeRisk.test.js
git commit -m "feat(route-risk): add Layer 3 interaction penalty"
```

---

### Task 6: Rewrite scoreRouteCandidate with three-layer model

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.js` (rewrite scoreRouteCandidate)

- [ ] **Step 1: Rewrite scoreRouteCandidate**

Replace the current `scoreRouteCandidate` function (lines 599-706) with:

```js
export function scoreRouteCandidate({
  route,
  hazards,
  userLevel,
  userProfile = null,
  fastestRoute,
  geographyProfile = null,
  now = new Date(),
  maxFeelsLike = null,
  candidateCount = 1,
}) {
  const geometry = route.geometry || [];
  const midpoint = geometry.length
    ? geometry[Math.floor(geometry.length / 2)]
    : [-37.81, 144.96];

  // Layer 1: Base Risk
  const hazardExposure = computeHazardExposure(hazards, geometry, now);
  const routeEffort = computeRouteEffort(route, geographyProfile);
  const terrainDanger = computeTerrainDanger(geometry, hazards, geographyProfile, now);

  const baseRisk = clamp(
    0.40 * hazardExposure.score
    + 0.30 * routeEffort.score
    + 0.30 * terrainDanger.score,
  );

  // Layer 2: Environmental Multiplier
  const season = seasonFromDate(now);
  const env = computeEnvMultiplier({
    lat: midpoint[0],
    lng: midpoint[1],
    now,
    durationMin: route.durationMin || 0,
    season,
    maxFeelsLike,
  });

  // Layer 3: Interaction Penalty
  const interactionPenalty = computeInteractionPenalty({
    hazardTypes: [...new Set(hazards.map((h) => h.type))],
    hazardImpacts: hazardExposure.impacts,
    geographyProfile,
    durationMin: route.durationMin || 0,
    sunsetHour: env.sunsetHour,
    finishHour: env.finishHour,
    maxFeelsLike,
    candidateCount,
  });

  const rawWeighted = clamp(baseRisk * env.multiplier + interactionPenalty);
  const profileFactor = USER_RISK_FACTOR[userLevel] || USER_RISK_FACTOR.newcomer;
  const weightedTotal = clamp(rawWeighted * profileFactor);

  // Go/No-Go (unchanged interface)
  const goNoGoResult = goNoGoDecision({
    userLevel,
    riskScore: weightedTotal,
    hazardImpacts: hazardExposure.impacts,
    routeDistanceKm: route.distanceKm || 0,
    routeDurationMin: route.durationMin || 0,
    geographyProfile,
  });
  const goNoGo = goNoGoResult.goNoGo;
  const noGoFloorScore = goNoGo === 'No-Go' ? noGoFloorScoreByReason(goNoGoResult.noGoReasons) : 0;
  const adjustedWeightedTotal = clamp(Math.max(weightedTotal, noGoFloorScore));
  const riskLevel = riskLevelByScore(adjustedWeightedTotal);

  // Key risks, explanation, difficulty (unchanged logic)
  const coverageImpacts = terrainDanger.coverageImpacts;
  const keyRisks = coverageImpacts.slice(0, 3).map((item) => ({
    id: item.hazard.id,
    title: item.hazard.title,
    type: item.hazard.type,
    severity: item.hazard.severity,
    distanceKm: Number(item.distanceKm.toFixed(2)),
    source: item.hazard.source,
    zoneLevel: item.zoneLevel,
    zoneLabel: zoneLabel(item.zoneLevel),
    advice: riskAdviceByType({
      type: item.hazard.type,
      severity: item.hazard.severity,
      distanceKm: item.distanceKm,
    }),
  }));

  const explanation = buildExplanation({
    chosenRoute: route,
    fastestRoute,
    topHazards: hazardExposure.impacts.slice(0, 2),
    goNoGo,
    geographyProfile,
  });

  const difficulty = difficultyLabel(routeEffort.burdenScore, geographyProfile);

  return {
    ...route,
    difficulty,
    riskScore: Number(adjustedWeightedTotal.toFixed(1)),
    riskLevel,
    goNoGo,
    safetyStatus: goNoGo === 'No-Go' ? 'Dangerous' : 'Safe',
    noGoReasons: goNoGoResult.noGoReasons,
    explanation,
    keyRisks,
    geographyProfile,
    zoneSummary: {
      level1Count: coverageImpacts.filter((item) => item.zoneLevel === 1).length,
      level2Count: coverageImpacts.filter((item) => item.zoneLevel === 2).length,
      level3Count: coverageImpacts.filter((item) => item.zoneLevel === 3).length,
    },
    suggestedPrep: buildSuggestedPrep({
      route,
      userLevel,
      userProfile,
      keyRisks,
      riskScore: adjustedWeightedTotal,
      goNoGo,
      geographyProfile,
      difficultyTier: difficulty,
      now,
    }),
    scoringBreakdown: {
      baseRisk: Number(baseRisk.toFixed(1)),
      hazardExposure: Number(hazardExposure.score.toFixed(1)),
      diversityBoost: hazardExposure.diversityBoost,
      routeEffort: Number(routeEffort.score.toFixed(1)),
      burdenScore: routeEffort.burdenScore,
      elevationFatigue: routeEffort.elevationFatigue,
      terrainDanger: Number(terrainDanger.score.toFixed(1)),
      zoneCoverage: terrainDanger.zoneCoverage,
      terrainSurface: terrainDanger.terrainSurface,
      exposureCounts: terrainDanger.exposureCounts,
      envMultiplier: env.multiplier,
      sunAdjust: env.sunAdjust,
      seasonAdjust: env.seasonAdjust,
      tempAdjust: env.tempAdjust,
      sunsetHour: env.sunsetHour,
      finishHour: env.finishHour,
      interactionPenalty: Number(interactionPenalty.toFixed(1)),
      baseWeightedTotal: Number(rawWeighted.toFixed(1)),
      profileFactor: Number(profileFactor.toFixed(2)),
      weightedTotal: Number(adjustedWeightedTotal.toFixed(1)),
      noGoFloorScore: Number(noGoFloorScore.toFixed(1)),
    },
  };
}
```

- [ ] **Step 2: Export new functions for testing**

Add to the `__testing__` export at the bottom of the file:

```js
export const __testing__ = {
  computeSunsetHour: computeDayMinutes,
  computeEnvMultiplier,
  computeInteractionPenalty,
  computeHazardExposure,
  computeRouteEffort,
  computeTerrainDanger,
  toblerSpeedKmh: undefined, // from routeTiming
  naismithAscentMinutes: undefined,
  langmuirDescentMinutes: undefined,
  breakMinutes: undefined,
};
```

Actually, use a separate export to avoid mixing with routeTiming. Append at end of routeRisk.js:

```js
export const __testing_risk__ = {
  computeDayMinutes,
  computeEnvMultiplier,
  computeInteractionPenalty,
  computeHazardExposure,
  computeRouteEffort,
  computeTerrainDanger,
};
```

- [ ] **Step 3: Update existing integration tests to use new scoringBreakdown shape**

In the existing tests that check `scoringBreakdown`, update field references from `hazardScore`/`weatherScore`/etc. to the new `baseRisk`/`hazardExposure`/`envMultiplier`/etc.

- [ ] **Step 4: Write integration test for three-layer model**

```js
test('three-layer model: night+summer+heat+fire+steep route scores higher than day+autumn+mild+flat', () => {
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
    `bad conditions (${badConditions.riskScore}) should score higher than good (${goodConditions.riskScore})`);
  assert.ok(badConditions.scoringBreakdown.envMultiplier > 1.1,
    `bad env multiplier should be >1.1, got ${badConditions.scoringBreakdown.envMultiplier}`);
  assert.ok(badConditions.scoringBreakdown.interactionPenalty > 0,
    `should have interaction penalty, got ${badConditions.scoringBreakdown.interactionPenalty}`);
  assert.ok(goodConditions.scoringBreakdown.envMultiplier < 1.05,
    `good env multiplier should be near 1.0, got ${goodConditions.scoringBreakdown.envMultiplier}`);
});
```

- [ ] **Step 5: Run all tests**

Run: `cd /Users/junqiliu/Desktop/IT/goHiking/backend && NODE_ENV=test node --test`
Expected: all tests pass (at least 35+ tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js backend/src/modules/routes/domain/routeRisk.test.js
git commit -m "feat(route-risk): rewrite scoring with three-layer model"
```

---

### Task 7: Update routePlannerService to pass new parameters

**Files:**
- Modify: `backend/src/modules/routes/services/routePlannerService.js`

- [ ] **Step 1: Extract maxFeelsLike from hazards**

Add helper function before `planSaferRoute`:

```js
function extractMaxFeelsLike(hazards) {
  let maxTemp = null;
  hazards.forEach((hazard) => {
    const temp = Number(hazard.metadata?.feelsLike || hazard.feelsLike);
    if (Number.isFinite(temp) && (maxTemp === null || temp > maxTemp)) {
      maxTemp = temp;
    }
  });
  return maxTemp;
}
```

- [ ] **Step 2: Pass new params to scoreRouteCandidate**

Update the scoring call (around line 272-282):

```js
const maxFeelsLike = extractMaxFeelsLike(hazards);

const scored = candidatesWithGeography.map(({ route, geographyProfile }) =>
  scoreRouteCandidate({
    route,
    hazards,
    userLevel,
    userProfile,
    fastestRoute,
    geographyProfile,
    now,
    maxFeelsLike,
    candidateCount: candidatesWithGeography.length,
  }),
);
```

- [ ] **Step 3: Update OpenWeather adapter to store feelsLike in hazard metadata**

Modify `backend/src/modules/hazards/adapters/bomAdapter.js`, in the heat hazard push (~line 52-66), add `feelsLike` to metadata:

In each `sanitizeHazard({...})` call, ensure `metadata.feelsLike = feelsLike` is set. The heat hazard already has `feelsLike` in scope. Add to metadata:

For heat hazard:
```js
metadata: { feelsLike, checkpointId: point.id },
```

Also add `feelsLike` directly on the hazard object so `extractMaxFeelsLike` can pick it up:

```js
// After coordinates, add:
feelsLike: Number.isFinite(feelsLike) ? feelsLike : undefined,
```

Actually, looking at the sanitizeHazard function, metadata might not be preserved. Let me take a simpler approach — add `feelsLike` as a direct property on the hazard object. The OpenWeather adapter already creates the hazard object, so I'll just add the field there.

- [ ] **Step 3 (revised): Add feelsLike as direct hazard property**

In `bomAdapter.js`, for each hazard push, add `feelsLike` field:

For heat hazards (line 52-66):
```js
feelsLike: Number.isFinite(feelsLike) ? Math.round(feelsLike) : undefined,
```

For wind/storm hazards (line 68-83):
```js
feelsLike: Number.isFinite(feelsLike) ? Math.round(feelsLike) : undefined,
```

For rain/flood hazards (line 86-99):
```js
feelsLike: Number.isFinite(feelsLike) ? Math.round(feelsLike) : undefined,
```

For freeze hazards (line 102-117):
```js
feelsLike: Number.isFinite(feelsLike) ? Math.round(feelsLike) : undefined,
```

- [ ] **Step 2 (revised): Simplify extractMaxFeelsLike**

Since `feelsLike` is now a direct hazard property:

```js
function extractMaxFeelsLike(hazards) {
  let maxTemp = null;
  hazards.forEach((hazard) => {
    const temp = Number(hazard.feelsLike);
    if (Number.isFinite(temp) && (maxTemp === null || temp > maxTemp)) {
      maxTemp = temp;
    }
  });
  return maxTemp;
}
```

- [ ] **Step 3: Run all tests**

Run: `cd /Users/junqiliu/Desktop/IT/goHiking/backend && NODE_ENV=test node --test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/routes/services/routePlannerService.js backend/src/modules/hazards/adapters/bomAdapter.js
git commit -m "feat(route-planner): pass temperature data to three-layer risk scorer"
```

---

### Task 8: Final integration test and cleanup

**Files:**
- Modify: `backend/src/modules/routes/domain/routeRisk.test.js` (final cleanup)

- [ ] **Step 1: Verify all existing tests pass with new model**

Run full test suite and fix any test that references old scoringBreakdown field names:
- `hazardScore` → `hazardExposure`
- `weatherScore` → removed (folded into hazardExposure)
- `zoneExposureScore` → `zoneCoverage` (under terrainDanger)
- `difficultyScore` → `burdenScore` (under routeEffort)
- `geographyScore` → split into `elevationFatigue` + `terrainSurface` + `exposureCounts`

Run: `cd /Users/junqiliu/Desktop/IT/goHiking/backend && NODE_ENV=test node --test`
Fix any failures.

- [ ] **Step 2: Remove dead code**

Remove the old `topImpactAverage` and `collectCoverageImpacts` functions if they're now only called from the new Layer 1 functions (they're still used — keep them). The old `geographyRiskScore` function can be removed since its logic is now split between `computeRouteEffort` and `computeTerrainDanger`.

Actually, `geographyRiskScore` is only used in the old `scoreRouteCandidate` which we're replacing. After the rewrite, check if anything else references it:
- `computeRouteEffort` uses elevation directly
- `computeTerrainDanger` uses terrainSurface + exposureCounts
- So `geographyRiskScore` becomes dead code — remove it.

- [ ] **Step 3: Final test run**

Run: `cd /Users/junqiliu/Desktop/IT/goHiking/backend && NODE_ENV=test node --test`
Expected: all tests pass (35+ tests)

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/routes/domain/routeRisk.js backend/src/modules/routes/domain/routeRisk.test.js
git commit -m "chore(route-risk): remove dead code, finalize three-layer model"
```

---

### Task 9: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

Verify all tests pass on CI if available.
