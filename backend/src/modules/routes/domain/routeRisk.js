const SEVERITY_BASE = {
  low: 20,
  moderate: 50,
  high: 80,
  extreme: 100
};

const TYPE_FACTOR = {
  fire: 1.2,
  flood: 1.0,
  storm: 1.0,
  heat: 0.9,
  other: 0.7
};

const WEATHER_TYPES = new Set(['heat', 'flood', 'storm']);
const USER_RISK_FACTOR = {
  newcomer: 1.1,
  intermediate: 1.0,
  advanced: 0.92
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
  if (distanceKm <= 1) return 1.0;
  if (distanceKm <= 3) return 0.6;
  if (distanceKm <= 5) return 0.3;
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
    .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= 10 && item.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  if (!impacts.length) {
    return {
      score: 0,
      impacts: []
    };
  }

  const avg = impacts.reduce((sum, item) => sum + item.impact, 0) / impacts.length;
  const densityBoost = Math.min(1.6, 0.7 + (impacts.length * 0.2));
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

function difficultyScore(route, fastestRoute) {
  const distanceKm = route.distanceKm || 0;
  const durationMin = route.durationMin || 0;

  const baseDistance = clamp((Math.log1p(Math.max(distanceKm, 0)) / Math.log1p(80)) * 100);
  const baseDuration = clamp((Math.log1p(Math.max(durationMin, 0)) / Math.log1p(480)) * 100);

  const fastestDistance = Math.max(fastestRoute?.distanceKm || distanceKm || 1, 1);
  const fastestDuration = Math.max(fastestRoute?.durationMin || durationMin || 1, 1);
  const detourDistancePenalty = clamp(((distanceKm - fastestDistance) / fastestDistance) * 120, 0, 100);
  const detourDurationPenalty = clamp(((durationMin - fastestDuration) / fastestDuration) * 120, 0, 100);

  return clamp(
    (0.35 * baseDistance)
    + (0.25 * baseDuration)
    + (0.2 * detourDistancePenalty)
    + (0.2 * detourDurationPenalty)
  );
}

function riskLevelByScore(score) {
  if (score >= 75) return 'Extreme';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

function difficultyLabel(score) {
  if (score >= 70) return 'Hard';
  if (score >= 40) return 'Moderate';
  return 'Easy';
}

function isOpenWeatherHazard(hazard) {
  return String(hazard.source || '').toLowerCase().includes('openweather') && WEATHER_TYPES.has(hazard.type);
}

function goNoGoDecision({ userLevel, riskScore, impacts }) {
  const thresholds = {
    newcomer: { score: 55, extremeDistanceKm: 2 },
    intermediate: { score: 70, extremeDistanceKm: 1.5 },
    advanced: { score: 80, extremeDistanceKm: 1 }
  };
  const current = thresholds[userLevel] || thresholds.newcomer;

  const hasExtremeTooClose = impacts.some(
    (item) => item.hazard.severity === 'extreme' && item.distanceKm <= current.extremeDistanceKm
  );
  if (hasExtremeTooClose || riskScore >= current.score) return 'No-Go';
  return 'Go';
}

function buildExplanation({ chosenRoute, fastestRoute, topHazards, goNoGo }) {
  if (!topHazards.length) {
    return goNoGo === 'Go'
      ? 'No high-impact hazards were detected close to the selected path. Conditions are comparatively stable.'
      : 'Risk remains elevated for your current profile despite limited nearby hazard overlap.';
  }

  const first = topHazards[0];
  const level = zoneLevelByDistance(first.distanceKm);
  const reason = `${first.hazard.type} risk enters ${zoneLabel(level)} (${first.distanceKm.toFixed(1)} km from path)`;
  const detourMinutes = Math.max(0, Math.round(chosenRoute.durationMin - fastestRoute.durationMin));
  if (detourMinutes > 0) {
    return `This route is recommended because it reduces exposure where ${reason}. It adds about ${detourMinutes} minutes for safer conditions.`;
  }
  return `This route is recommended because ${reason} and overall risk is lower for your profile.`;
}

function levelNoun(userLevel) {
  if (userLevel === 'advanced') return 'advanced hiker';
  if (userLevel === 'intermediate') return 'intermediate hiker';
  return 'newcomer hiker';
}

function riskAdviceByType({ type, severity, distanceKm, userLevel }) {
  const level = zoneLevelByDistance(distanceKm);
  const prefix = `${severity} ${type} risk in ${zoneLabel(level)} (~${distanceKm.toFixed(1)} km from route)`;
  if (type === 'fire') {
    return `${prefix}. As a ${levelNoun(userLevel)}, keep a hard turnaround trigger if alert level increases.`;
  }
  if (type === 'flood') {
    return `${prefix}. Avoid creek crossings after rainfall peaks and keep alternate exit points.`;
  }
  if (type === 'storm') {
    return `${prefix}. Delay exposed ridge sections and monitor lightning/wind updates before departure.`;
  }
  if (type === 'heat') {
    return `${prefix}. Shift to earlier start times and increase hydration/rest frequency.`;
  }
  return `${prefix}. Keep route flexibility and check nearby official incident updates.`;
}

function buildSuggestedPrep({ route, userLevel, keyRisks, riskScore, goNoGo }) {
  const tips = [];
  const distanceKm = route.distanceKm || 0;
  const durationMin = route.durationMin || 0;

  if (durationMin >= 180) {
    tips.push('Long-duration route: carry a headlamp, power bank, and spare warm layer.');
  }
  if (distanceKm >= 20) {
    tips.push('Long-distance route: bring enough food, blister care, and at least 2.5L water per person.');
  }
  if (distanceKm >= 30 || durationMin >= 300) {
    tips.push('Extended outing: pack emergency shelter (tent/bivy), thermal blanket, and offline map.');
  }

  if (keyRisks.some((risk) => risk.type === 'fire')) {
    tips.push('Fire-aware prep: verify evacuation roads and set a strict no-go trigger before departure.');
  }
  if (keyRisks.some((risk) => risk.type === 'heat')) {
    tips.push('Heat-aware prep: include electrolytes, sun protection, and reduce midday exposure.');
  }
  if (keyRisks.some((risk) => ['flood', 'storm'].includes(risk.type))) {
    tips.push('Rain/storm prep: waterproof gear, dry bag for phone, and avoid low-lying shortcuts.');
  }

  if (userLevel === 'newcomer') {
    tips.push('Newcomer safety: hike with a partner and share ETA/check-in time with a trusted contact.');
  } else if (userLevel === 'intermediate') {
    tips.push('Intermediate safety: keep one fallback route and reassess alerts at midpoint.');
  } else {
    tips.push('Advanced safety: define objective turnaround thresholds before committing to exposed sections.');
  }

  if (goNoGo === 'No-Go' || riskScore >= 70) {
    tips.push('Current risk is elevated: postpone or switch to a shorter low-exposure route today.');
  }

  return [...new Set(tips)].slice(0, 6);
}

export function scoreRouteCandidate({ route, hazards, userLevel, fastestRoute }) {
  const geometry = route.geometry || [];
  const hazardAgg = topImpactAverage(hazards, geometry, () => true);
  const weatherAgg = topImpactAverage(hazards, geometry, (hazard) => isOpenWeatherHazard(hazard));
  const coverageImpacts = collectCoverageImpacts(hazards, geometry);

  const routeDifficultyScore = difficultyScore(route, fastestRoute);
  const rawWeighted = clamp(
    (0.55 * hazardAgg.score) + (0.25 * weatherAgg.score) + (0.20 * routeDifficultyScore)
  );
  const profileFactor = USER_RISK_FACTOR[userLevel] || USER_RISK_FACTOR.newcomer;
  const weightedTotal = clamp(rawWeighted * profileFactor);
  const riskLevel = riskLevelByScore(weightedTotal);

  const goNoGo = goNoGoDecision({
    userLevel,
    riskScore: weightedTotal,
    impacts: hazardAgg.impacts
  });

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
      userLevel
    })
  }));

  const explanation = buildExplanation({
    chosenRoute: route,
    fastestRoute,
    topHazards: hazardAgg.impacts.slice(0, 2),
    goNoGo
  });

  return {
    ...route,
    difficulty: difficultyLabel(routeDifficultyScore),
    riskScore: Number(weightedTotal.toFixed(1)),
    riskLevel,
    goNoGo,
    explanation,
    keyRisks,
    zoneSummary: {
      level1Count: coverageImpacts.filter((item) => item.zoneLevel === 1).length,
      level2Count: coverageImpacts.filter((item) => item.zoneLevel === 2).length,
      level3Count: coverageImpacts.filter((item) => item.zoneLevel === 3).length
    },
    suggestedPrep: buildSuggestedPrep({
      route,
      userLevel,
      keyRisks,
      riskScore: weightedTotal,
      goNoGo
    }),
    scoringBreakdown: {
      hazardScore: Number(hazardAgg.score.toFixed(1)),
      weatherScore: Number(weatherAgg.score.toFixed(1)),
      difficultyScore: Number(routeDifficultyScore.toFixed(1)),
      baseWeightedTotal: Number(rawWeighted.toFixed(1)),
      profileFactor: Number(profileFactor.toFixed(2)),
      weightedTotal: Number(weightedTotal.toFixed(1))
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
  const offsetKm = clamp(lineDistanceKm * 0.25, 5, 25);
  const latDeg = offsetKm / 111.32;
  const lngDeg = offsetKm / (111.32 * Math.cos(toRad(mid[0])) || 1);

  return [
    {
      lat: mid[0] + (perpLat * latDeg),
      lng: mid[1] + (perpLng * lngDeg)
    },
    {
      lat: mid[0] - (perpLat * latDeg),
      lng: mid[1] - (perpLng * lngDeg)
    }
  ];
}
