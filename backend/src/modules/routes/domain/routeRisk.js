const SEVERITY_BASE = {
  low: 20,
  moderate: 50,
  high: 80,
  extreme: 100
};

const TYPE_FACTOR = {
  fire: 1.3,
  flood: 1.1,
  storm: 1.05,
  heat: 0.95,
  trail: 1.0,
  other: 0.85
};

const WEATHER_TYPES = new Set(['heat', 'flood', 'storm']);
const USER_RISK_FACTOR = {
  newcomer: 1.12,
  intermediate: 1.0,
  advanced: 0.9
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toLocalXY([lat, lng], referenceLat) {
  const x = lng * 111.32 * Math.cos(toRad(referenceLat));
  const y = lat * 111.32;
  return [x, y];
}

function pointToSegmentDistanceKm(point, segmentStart, segmentEnd) {
  const refLat = (point[0] + segmentStart[0] + segmentEnd[0]) / 3;
  const [px, py] = toLocalXY(point, refLat);
  const [ax, ay] = toLocalXY(segmentStart, refLat);
  const [bx, by] = toLocalXY(segmentEnd, refLat);
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  const nearestX = ax + t * dx;
  const nearestY = ay + t * dy;
  return Math.hypot(px - nearestX, py - nearestY);
}

export function distanceToRouteKm(point, geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2) return Infinity;

  let minDistance = Infinity;
  for (let i = 0; i < geometry.length - 1; i += 1) {
    const nextDistance = pointToSegmentDistanceKm(point, geometry[i], geometry[i + 1]);
    if (nextDistance < minDistance) minDistance = nextDistance;
  }
  return minDistance;
}

function distanceFactor(distanceKm) {
  if (distanceKm <= 0.5) return 1.0;
  if (distanceKm <= 1.5) return 0.78;
  if (distanceKm <= 3) return 0.55;
  if (distanceKm <= 5) return 0.35;
  if (distanceKm <= 8) return 0.18;
  return 0;
}

function zoneLevelByDistance(distanceKm) {
  if (distanceKm <= 1) return 1;
  if (distanceKm <= 3) return 2;
  if (distanceKm <= 5) return 3;
  return 0;
}

function zoneLabel(level) {
  if (level === 1) return 'Level 1 Core Risk Zone';
  if (level === 2) return 'Level 2 Buffer Risk Zone';
  if (level === 3) return 'Level 3 Watch Risk Zone';
  return 'Outside Risk Zone';
}

function toHazardImpact(hazard, distanceKm) {
  const base = SEVERITY_BASE[hazard.severity] ?? 20;
  const factor = TYPE_FACTOR[hazard.type] ?? TYPE_FACTOR.other;
  const impact = base * distanceFactor(distanceKm) * factor * recencyFactor(hazard.updatedAt);
  return clamp(impact);
}

function recencyFactor(updatedAt) {
  const ts = Date.parse(updatedAt || '');
  if (Number.isNaN(ts)) return 0.6;

  const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
  if (ageHours <= 6) return 1.0;
  if (ageHours <= 24) return 0.85;
  if (ageHours <= 72) return 0.65;
  if (ageHours <= 24 * 7) return 0.45;
  if (ageHours <= 24 * 14) return 0.3;
  if (ageHours <= 24 * 30) return 0.15;
  return 0;
}

function topImpactAverage(hazards, geometry, filterFn) {
  const impacts = hazards
    .filter(filterFn)
    .map((hazard) => {
      const distanceKm = distanceToRouteKm(hazard.coordinates, geometry);
      return {
        hazard,
        distanceKm,
        impact: toHazardImpact(hazard, distanceKm)
      };
    })
    .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= 8 && item.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6);

  if (!impacts.length) {
    return {
      score: 0,
      impacts: []
    };
  }

  const avg = impacts.reduce((sum, item) => sum + item.impact, 0) / impacts.length;
  const densityBoost = Math.min(1.85, 0.78 + (impacts.length * 0.18));
  return {
    score: clamp(avg * densityBoost),
    impacts
  };
}

function collectCoverageImpacts(hazards, geometry, filterFn = () => true) {
  return hazards
    .filter(filterFn)
    .map((hazard) => {
      const distanceKm = distanceToRouteKm(hazard.coordinates, geometry);
      const zoneLevel = zoneLevelByDistance(distanceKm);
      return {
        hazard,
        distanceKm,
        zoneLevel,
        impact: toHazardImpact(hazard, distanceKm)
      };
    })
    .filter((item) => Number.isFinite(item.distanceKm) && item.zoneLevel > 0)
    .sort((a, b) => {
      if (a.zoneLevel !== b.zoneLevel) return a.zoneLevel - b.zoneLevel;
      return b.impact - a.impact;
    });
}

function distanceEnduranceScore(distanceKm) {
  const d = Math.max(distanceKm || 0, 0);
  if (d <= 8) return d * 3.5;
  if (d <= 20) return 28 + ((d - 8) * 2.25);
  if (d <= 40) return 55 + ((d - 20) * 1.5);
  if (d <= 70) return 85 + ((d - 40) * 0.4);
  return clamp(97 + (Math.log1p(d - 70) * 1.6));
}

function durationExposureScore(durationMin) {
  const mins = Math.max(durationMin || 0, 0);
  if (mins <= 120) return mins * 0.25;
  if (mins <= 360) return 30 + ((mins - 120) * 0.16);
  if (mins <= 720) return 68.4 + ((mins - 360) * 0.06);
  return clamp(90 + (Math.log1p(mins - 720) * 1.7));
}

function detourPenaltyScore(route, fastestRoute) {
  const distanceKm = route.distanceKm || 0;
  const durationMin = route.durationMin || 0;
  const fastestDistance = Math.max(fastestRoute?.distanceKm || distanceKm || 1, 1);
  const fastestDuration = Math.max(fastestRoute?.durationMin || durationMin || 1, 1);
  const extraDistanceRatio = Math.max(0, (distanceKm - fastestDistance) / fastestDistance);
  const extraDurationRatio = Math.max(0, (durationMin - fastestDuration) / fastestDuration);
  return clamp((extraDistanceRatio * 55) + (extraDurationRatio * 65));
}

function routeBurdenScore(route, fastestRoute) {
  const distanceScore = distanceEnduranceScore(route.distanceKm || 0);
  const durationScore = durationExposureScore(route.durationMin || 0);
  const detourScore = detourPenaltyScore(route, fastestRoute);
  return clamp((0.4 * distanceScore) + (0.45 * durationScore) + (0.15 * detourScore));
}

function coverageZoneScore(coverageImpacts) {
  if (!coverageImpacts.length) return 0;

  let total = 0;
  coverageImpacts.forEach((item, index) => {
    const base = item.zoneLevel === 1 ? 30 : item.zoneLevel === 2 ? 14 : 6;
    const severityFactor = (SEVERITY_BASE[item.hazard.severity] ?? 20) / 100;
    const decay = Math.max(0.35, 1 - (index * 0.14));
    total += base * severityFactor * decay;
  });

  return clamp(total);
}

function feasibilityPenaltyScore(route) {
  const distanceKm = Math.max(route.distanceKm || 0, 0);
  const durationMin = Math.max(route.durationMin || 0, 0);
  const extraDistance = Math.max(0, distanceKm - 25);
  const extraDurationHours = Math.max(0, (durationMin - 360) / 60);
  return clamp((extraDistance * 0.7) + (extraDurationHours * 4.5), 0, 40);
}

function terrainPenalty(surfaceType, trailCondition) {
  const roughSurfaces = new Set(['gravel', 'rock', 'ground', 'dirt', 'mud', 'sand', 'pebblestone']);
  const poorConditions = new Set(['bad', 'very_bad', 'horrible', 'no', 'intermediate', 'poor']);

  let score = 0;
  if (roughSurfaces.has(String(surfaceType || '').toLowerCase())) score += 16;
  if (poorConditions.has(String(trailCondition || '').toLowerCase())) score += 24;
  return clamp(score, 0, 30);
}

function geographyRiskScore(geographyProfile) {
  if (!geographyProfile) return 0;

  const ascentScore = clamp((Number(geographyProfile.totalAscentM || 0) / 1400) * 100);
  const descentScore = clamp((Number(geographyProfile.totalDescentM || 0) / 1600) * 100);
  const slopeScore = clamp((Number(geographyProfile.maxSlopePct || 0) / 35) * 100);
  const exposureScore = clamp(
    (Number(geographyProfile.riverCrossingCount || 0) * 10)
    + (Number(geographyProfile.cliffExposureCount || 0) * 14)
    + (Number(geographyProfile.closureCount || 0) * 28),
    0,
    100
  );
  const terrainScore = terrainPenalty(geographyProfile.surfaceType, geographyProfile.trailCondition);

  return clamp(
    (0.22 * ascentScore)
    + (0.12 * descentScore)
    + (0.28 * slopeScore)
    + (0.28 * exposureScore)
    + (0.10 * terrainScore)
  );
}

function riskLevelByScore(score) {
  if (score >= 85) return 'Extreme';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

function noGoFloorScoreByReason(reasons = {}) {
  if (reasons.hasExtremeTooClose || reasons.hasRouteClosure) return 85;
  if (reasons.hasSevereCliffExposure || reasons.hasSteepTerrainForUser) return 72;
  if (reasons.exceedsDistanceCap || reasons.exceedsDurationCap) return 65;
  if (reasons.exceedsScoreThreshold) return 65;
  return 0;
}

function difficultyLabel(burdenScore, geographyProfile = null) {
  // Burden score is already 0-100 based on distance/duration/detour.
  // Geography contributes an additive fatigue index 0-100 based on elevation
  // and terrain roughness; this lets a short but steep route still be "Hard".
  const ascentScore = clamp((Number(geographyProfile?.totalAscentM || 0) / 900) * 100);
  const slopeScore = clamp((Number(geographyProfile?.maxSlopePct || 0) / 28) * 100);
  const terrainScore = terrainPenalty(
    geographyProfile?.surfaceType,
    geographyProfile?.trailCondition,
  ) * (100 / 30);
  const fatigueIndex = clamp(
    (0.5 * ascentScore)
    + (0.35 * slopeScore)
    + (0.15 * terrainScore),
  );

  const composite = clamp((0.6 * (Number(burdenScore) || 0)) + (0.4 * fatigueIndex));

  if (composite >= 72) return 'Hard';
  if (composite >= 38) return 'Moderate';
  return 'Easy';
}

function isOpenWeatherHazard(hazard) {
  return String(hazard.source || '').toLowerCase().includes('openweather') && WEATHER_TYPES.has(hazard.type);
}

function goNoGoDecision({ userLevel, riskScore, impacts, geographyProfile }) {
  const thresholds = {
    newcomer: { score: 52, extremeDistanceKm: 2, maxDistanceKm: 30, maxDurationMin: 480 },
    intermediate: { score: 66, extremeDistanceKm: 1.5, maxDistanceKm: 45, maxDurationMin: 660 },
    advanced: { score: 78, extremeDistanceKm: 1, maxDistanceKm: 60, maxDurationMin: 840 }
  };
  const current = thresholds[userLevel] || thresholds.newcomer;

  const hasExtremeTooClose = impacts.some(
    (item) => item.hazard.severity === 'extreme' && item.distanceKm <= current.extremeDistanceKm
  );
  const exceedsDistanceCap = (impacts.routeDistanceKm || 0) > current.maxDistanceKm;
  const exceedsDurationCap = (impacts.routeDurationMin || 0) > current.maxDurationMin;
  const hasRouteClosure = Number(geographyProfile?.closureCount || 0) > 0;
  const hasSevereCliffExposure = userLevel !== 'advanced' && Number(geographyProfile?.cliffExposureCount || 0) >= 2;
  const hasSteepTerrainForUser =
    (userLevel === 'newcomer' && Number(geographyProfile?.maxSlopePct || 0) >= 22)
    || (userLevel === 'intermediate' && Number(geographyProfile?.maxSlopePct || 0) >= 30);
  const exceedsScoreThreshold = riskScore >= current.score;
  const noGoReasons = {
    hasExtremeTooClose,
    exceedsDistanceCap,
    exceedsDurationCap,
    hasRouteClosure,
    hasSevereCliffExposure,
    hasSteepTerrainForUser,
    exceedsScoreThreshold,
  };

  return {
    goNoGo: Object.values(noGoReasons).some(Boolean) ? 'No-Go' : 'Go',
    noGoReasons,
  };
}

function buildExplanation({ chosenRoute, fastestRoute, topHazards, goNoGo, geographyProfile }) {
  if (Number(geographyProfile?.closureCount || 0) > 0) {
    return 'Part of this route is currently closed. Please choose another route for now.';
  }

  if ((chosenRoute.durationMin || 0) >= 720 || (chosenRoute.distanceKm || 0) >= 60) {
    return `This route is very long (${chosenRoute.distanceKm.toFixed(1)} km, about ${Math.round(chosenRoute.durationMin / 60)} hours). Consider a shorter route or split this trip into multiple days.`;
  }

  if ((geographyProfile?.riverCrossingCount || 0) > 0 || (geographyProfile?.cliffExposureCount || 0) > 0) {
    const parts = [];
    if ((geographyProfile?.riverCrossingCount || 0) > 0) parts.push(`${geographyProfile.riverCrossingCount} river/ford crossing areas`);
    if ((geographyProfile?.cliffExposureCount || 0) > 0) parts.push(`${geographyProfile.cliffExposureCount} cliff-exposure sections`);
    return `This route needs extra care because it includes ${parts.join(' and ')}.`;
  }

  if (!topHazards.length) {
    return goNoGo === 'Go'
      ? 'No major hazards were found near this route right now.'
      : 'Risk is still high for this route right now.';
  }

  const first = topHazards[0];
  const reason = `${first.hazard.type} risk is about ${first.distanceKm.toFixed(1)} km from this route`;
  const detourMinutes = Math.max(0, Math.round(chosenRoute.durationMin - fastestRoute.durationMin));
  if (detourMinutes > 0) {
    return `This route is safer because ${reason}. It adds about ${detourMinutes} minutes.`;
  }
  return `This route is recommended because ${reason}, and the overall risk is lower.`;
}

function riskAdviceByType({ type, severity, distanceKm }) {
  const prefix = `${severity} ${type} risk is about ${distanceKm.toFixed(1)} km from this route`;
  if (type === 'fire') {
    return `${prefix}. If alerts rise, turn back early.`;
  }
  if (type === 'flood') {
    return `${prefix}. Avoid creek crossings and keep an exit option.`;
  }
  if (type === 'storm') {
    return `${prefix}. Avoid exposed ridges and watch weather updates.`;
  }
  if (type === 'heat') {
    return `${prefix}. Start early and drink more water.`;
  }
  return `${prefix}. Stay flexible and check official updates.`;
}

// Maps a raw assessment answer object to the list of weakness keys the user
// demonstrated. Alignment with `backend/src/modules/auth/domain/assessment.js`:
//   q_weather: option 'a' scores 0  → weather-awareness gap
//   q_injury:  option 'b' scores 0  → injury/first-aid gap
//   q_lost:    option 'c' scores 0  → navigation gap
//   q_fire:    option 'a' scores 0  → fire-awareness gap
function deriveAssessmentGaps(answers = {}) {
  const gaps = new Set();
  const normalized = Object.fromEntries(
    Object.entries(answers || {}).map(([k, v]) => [k, String(v || '').toLowerCase()]),
  );
  if (normalized.q_weather === 'a') gaps.add('weather');
  if (normalized.q_injury === 'b') gaps.add('injury');
  if (normalized.q_lost === 'c') gaps.add('navigation');
  if (normalized.q_fire === 'a') gaps.add('fire');
  return Array.from(gaps);
}

function ageBracket(age) {
  const numeric = Number(age);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'unknown';
  if (numeric < 18) return 'minor';
  if (numeric >= 60) return 'senior';
  return 'adult';
}

// Southern-hemisphere season since HikeShield targets Victoria, AU.
function seasonFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const month = d.getMonth();
  if ([11, 0, 1].includes(month)) return 'summer';
  if ([2, 3, 4].includes(month)) return 'autumn';
  if ([5, 6, 7].includes(month)) return 'winter';
  return 'spring';
}

function isVictorianRegion(region = '') {
  const v = String(region || '').trim().toLowerCase();
  if (!v) return true;
  return ['victoria', 'vic', 'melbourne', 'au-vic'].some((token) => v.includes(token));
}

function pushTip(list, seen, key, priority, text) {
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ key, priority, text });
}

function buildSuggestedPrep({
  route,
  userLevel,
  userProfile,
  keyRisks,
  riskScore,
  goNoGo,
  geographyProfile,
  now,
  maxTips = 7,
}) {
  const tips = [];
  const seen = new Set();

  const distanceKm = Number(route?.distanceKm || 0);
  const durationMin = Number(route?.durationMin || 0);
  const ascentM = Number(geographyProfile?.totalAscentM || 0);
  const maxSlope = Number(geographyProfile?.maxSlopePct || 0);
  const riverCount = Number(geographyProfile?.riverCrossingCount || 0);
  const cliffCount = Number(geographyProfile?.cliffExposureCount || 0);
  const closureCount = Number(geographyProfile?.closureCount || 0);

  const bracket = ageBracket(userProfile?.age);
  const region = String(userProfile?.region || '');
  const gaps = deriveAssessmentGaps(userProfile?.assessmentAnswers);
  const season = seasonFromDate(now);
  const hazardTypes = new Set((keyRisks || []).map((risk) => risk.type));

  // === Hard safety blockers (highest priority) ===
  if (closureCount > 0) {
    pushTip(tips, seen, 'closure', 100,
      'Closure on route: do not try to bypass the barrier. Pick an alternate trail or turn around.');
  }
  if (goNoGo === 'No-Go' || riskScore >= 70) {
    pushTip(tips, seen, 'elevated-risk', 95,
      'Current risk is elevated: consider postponing, shortening, or swapping to a lower-exposure route today.');
  }

  // === Hazard-specific prep (priority 90) ===
  if (hazardTypes.has('fire')) {
    pushTip(tips, seen, 'hazard-fire', 92,
      'Fire-aware prep: check VicEmergency fire danger rating before leaving, set a strict turn-around trigger, and verify an evacuation road.');
  }
  if (hazardTypes.has('flood') || hazardTypes.has('storm')) {
    pushTip(tips, seen, 'hazard-weather', 90,
      'Rain/storm prep: waterproof outer shell, dry bag for phone, avoid creek fords and low-lying shortcuts.');
  }
  if (hazardTypes.has('heat')) {
    pushTip(tips, seen, 'hazard-heat', 88,
      'Heat-aware prep: electrolytes, UPF clothing, extra 1L water, and aim to finish exposed sections before 11 am.');
  }

  // === Personalized assessment-gap coaching (priority 85) ===
  if (gaps.includes('weather')) {
    pushTip(tips, seen, 'gap-weather', 85,
      'Weather-awareness gap (from your assessment): double-check BOM radar on the morning of, and pre-plan a weather turn-around cue.');
  }
  if (gaps.includes('injury')) {
    pushTip(tips, seen, 'gap-injury', 85,
      'Injury-response gap: carry a compact first-aid kit (bandage + elastic wrap + painkillers) and review how to manage a sprain before you go.');
  }
  if (gaps.includes('navigation')) {
    pushTip(tips, seen, 'gap-navigation', 85,
      'Navigation gap: download an offline map (AllTrails / Gaia), bring a fully-charged power bank, and share your GPS track before starting.');
  }
  if (gaps.includes('fire') && !hazardTypes.has('fire')) {
    pushTip(tips, seen, 'gap-fire', 82,
      'Fire-awareness gap: refresh the Fire Danger Rating system (Moderate/High/Extreme/Catastrophic) and commit to no-go on Extreme+ days.');
  }

  // === Age-bracket safety (priority 80) ===
  if (bracket === 'minor') {
    pushTip(tips, seen, 'age-minor', 80,
      'Under-18 outing: hike with a guardian or experienced partner, share an exact return time, and carry a whistle.');
  } else if (bracket === 'senior') {
    pushTip(tips, seen, 'age-senior', 80,
      '60+ safety: pace conservatively, carry any daily medication plus a spare dose, and consider trekking poles on descents.');
  }

  // === Route geography / effort (priority 72-76) ===
  if (ascentM >= 700) {
    pushTip(tips, seen, 'effort-ascent', 76,
      `High-ascent route (${Math.round(ascentM)} m climb): fuel up every 45 min, ration water for the climb, and slow the pace on steep pitches.`);
  }
  if (maxSlope >= 22) {
    pushTip(tips, seen, 'effort-slope', 74,
      `Steep section (max ${maxSlope.toFixed(0)}% grade): use trekking poles, sidestep on descents, and avoid loose rock edges.`);
  }
  if (riverCount > 0) {
    pushTip(tips, seen, 'effort-river', 74,
      `River/ford crossing (${riverCount}): test depth with a pole before committing; avoid crossings after heavy rain in the last 24h.`);
  }
  if (cliffCount > 0) {
    pushTip(tips, seen, 'effort-cliff', 72,
      `Cliff exposure (${cliffCount} section${cliffCount > 1 ? 's' : ''}): do not attempt in low visibility; keep a phone/whistle accessible.`);
  }

  // === Distance / duration (priority 70) ===
  if (distanceKm >= 30 || durationMin >= 300) {
    pushTip(tips, seen, 'long-outing', 72,
      'Extended outing: pack an emergency bivvy/thermal blanket, offline map, and plan a realistic bail-out at the midpoint.');
  } else if (distanceKm >= 20) {
    pushTip(tips, seen, 'long-distance', 68,
      'Long-distance hike: bring 2.5 L+ water, blister care (tape/leukotape), and a protein-rich lunch.');
  } else if (durationMin >= 180) {
    pushTip(tips, seen, 'long-duration', 64,
      'Multi-hour route: carry a headlamp + power bank in case the return runs late.');
  }

  // === Season-aware prep (priority 60-66) ===
  if (season === 'summer') {
    pushTip(tips, seen, 'season-summer', 66,
      'Australian summer: start before 7 am to beat heat, carry extra electrolytes, and watch for snakes on the trail edge.');
  } else if (season === 'winter') {
    pushTip(tips, seen, 'season-winter', 66,
      'Victorian winter: daylight ends by ~5 pm — set a turn-around by 3 pm, pack thermal mid-layer and beanie/gloves.');
  } else if (season === 'autumn') {
    pushTip(tips, seen, 'season-autumn', 60,
      'Autumn conditions: wet leaves are slippery on stone steps; add an insulating layer for after-sunset temps.');
  } else if (season === 'spring') {
    pushTip(tips, seen, 'season-spring', 60,
      'Spring conditions: snow can linger above 1000 m, streams may run high from melt — allow extra buffer time.');
  }

  // === Region context (priority 58) ===
  if (region && !isVictorianRegion(region)) {
    pushTip(tips, seen, 'region-visitor', 58,
      `Visiting Victoria from ${region}: monitor VicEmergency, know that mobile coverage drops outside main trails, and snakes are most active Oct–Apr.`);
  }

  // === Experience-level safety (priority 55) ===
  if (userLevel === 'newcomer') {
    pushTip(tips, seen, 'level-newcomer', 56,
      'Newcomer safety: hike with a partner and share your start/ETA with a trusted contact before you lose signal.');
  } else if (userLevel === 'intermediate') {
    pushTip(tips, seen, 'level-intermediate', 54,
      'Intermediate safety: keep one named fallback route and re-check alerts at the midpoint.');
  } else {
    pushTip(tips, seen, 'level-advanced', 52,
      'Advanced safety: set objective turn-around thresholds (time / weather / fatigue) before committing to exposed sections.');
  }

  tips.sort((a, b) => b.priority - a.priority);
  return tips.slice(0, maxTips).map((tip) => tip.text);
}

export function scoreRouteCandidate({
  route,
  hazards,
  userLevel,
  userProfile = null,
  fastestRoute,
  geographyProfile = null,
  now = new Date(),
}) {
  const geometry = route.geometry || [];
  const hazardAgg = topImpactAverage(hazards, geometry, () => true);
  const weatherAgg = topImpactAverage(hazards, geometry, (hazard) => isOpenWeatherHazard(hazard));
  const coverageImpacts = collectCoverageImpacts(hazards, geometry);
  const zoneExposure = coverageZoneScore(coverageImpacts);
  const routeDifficultyScore = routeBurdenScore(route, fastestRoute);
  const feasibilityScore = feasibilityPenaltyScore(route);
  const geographyScore = geographyRiskScore(geographyProfile);
  const rawWeighted = clamp(
    (0.34 * hazardAgg.score)
    + (0.12 * weatherAgg.score)
    + (0.18 * zoneExposure)
    + (0.16 * routeDifficultyScore)
    + (0.20 * geographyScore)
    + feasibilityScore
  );
  const profileFactor = USER_RISK_FACTOR[userLevel] || USER_RISK_FACTOR.newcomer;
  const weightedTotal = clamp(rawWeighted * profileFactor);

  const goNoGoResult = goNoGoDecision({
    userLevel,
    riskScore: weightedTotal,
    impacts: Object.assign([...hazardAgg.impacts], {
      routeDistanceKm: route.distanceKm || 0,
      routeDurationMin: route.durationMin || 0
    }),
    geographyProfile,
  });
  const goNoGo = goNoGoResult.goNoGo;
  const noGoFloorScore = goNoGo === 'No-Go' ? noGoFloorScoreByReason(goNoGoResult.noGoReasons) : 0;
  const adjustedWeightedTotal = clamp(Math.max(weightedTotal, noGoFloorScore));
  const riskLevel = riskLevelByScore(adjustedWeightedTotal);

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
      distanceKm: item.distanceKm
    })
  }));

  const explanation = buildExplanation({
    chosenRoute: route,
    fastestRoute,
    topHazards: hazardAgg.impacts.slice(0, 2),
    goNoGo,
    geographyProfile,
  });

  return {
    ...route,
    difficulty: difficultyLabel(routeDifficultyScore, geographyProfile),
    riskScore: Number(adjustedWeightedTotal.toFixed(1)),
    riskLevel,
    goNoGo,
    explanation,
    keyRisks,
    geographyProfile,
    zoneSummary: {
      level1Count: coverageImpacts.filter((item) => item.zoneLevel === 1).length,
      level2Count: coverageImpacts.filter((item) => item.zoneLevel === 2).length,
      level3Count: coverageImpacts.filter((item) => item.zoneLevel === 3).length
    },
    suggestedPrep: buildSuggestedPrep({
      route,
      userLevel,
      userProfile,
      keyRisks,
      riskScore: adjustedWeightedTotal,
      goNoGo,
      geographyProfile,
      now,
    }),
    scoringBreakdown: {
      hazardScore: Number(hazardAgg.score.toFixed(1)),
      weatherScore: Number(weatherAgg.score.toFixed(1)),
      zoneExposureScore: Number(zoneExposure.toFixed(1)),
      difficultyScore: Number(routeDifficultyScore.toFixed(1)),
      geographyScore: Number(geographyScore.toFixed(1)),
      feasibilityScore: Number(feasibilityScore.toFixed(1)),
      baseWeightedTotal: Number(rawWeighted.toFixed(1)),
      profileFactor: Number(profileFactor.toFixed(2)),
      weightedTotal: Number(adjustedWeightedTotal.toFixed(1)),
      noGoFloorScore: Number(noGoFloorScore.toFixed(1)),
    }
  };
}

export function buildDetourWaypointCandidates(start, end) {
  const mid = [(start.lat + end.lat) / 2, (start.lng + end.lng) / 2];
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const length = Math.hypot(dLat, dLng) || 1;
  const perpLat = -dLng / length;
  const perpLng = dLat / length;

  const lineDistanceKm = haversineKm([start.lat, start.lng], [end.lat, end.lng]);
  const offsetMagnitudesKm = [
    clamp(lineDistanceKm * 0.15, 2, 12),
    clamp(lineDistanceKm * 0.32, 6, 28),
  ];

  const cosLatFallback = Math.cos(toRad(mid[0])) || 1;
  const candidates = [];

  offsetMagnitudesKm.forEach((offsetKm) => {
    const latDeg = offsetKm / 111.32;
    const lngDeg = offsetKm / (111.32 * cosLatFallback);
    candidates.push({
      lat: mid[0] + (perpLat * latDeg),
      lng: mid[1] + (perpLng * lngDeg),
    });
    candidates.push({
      lat: mid[0] - (perpLat * latDeg),
      lng: mid[1] - (perpLng * lngDeg),
    });
  });

  return candidates;
}
