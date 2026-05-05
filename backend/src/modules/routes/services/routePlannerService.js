import { getLatestHazardSnapshot } from '../../../infrastructure/db/hazardSnapshotRepository.js';
import { getRouteContextByUserId } from '../../auth/services/authService.js';
import { fetchOpenRouteServiceRoutes } from '../adapters/openRouteServiceAdapter.js';
import { listCommunityReports } from '../../communityReports/repositories/communityReportRepository.js';
import { listManualHazards } from '../../hazards/repositories/manualHazardRepository.js';
import { buildDetourWaypointCandidates, buildSuggestedPrep, scoreRouteCandidate } from '../domain/routeRisk.js';
import { estimateHikingDurationMin } from '../domain/routeTiming.js';
import { getRouteGeographyProfileForRoute } from './routeGeographyService.js';
import { config } from '../../../config/index.js';
import { generateRouteIntroduction } from './routeNarrationService.js';

const MAX_CANDIDATES = 6;
const MAX_ROUTE_DIRECT_DISTANCE_KM = 80;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function directDistanceKm(start, end) {
  const earthRadiusKm = 6371;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assertCoordinate(point, fieldName) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${fieldName} must include numeric lat/lng`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${fieldName} coordinate is out of range`);
  }
  return { lat, lng };
}

const MIN_ROUTE_DIRECT_DISTANCE_M = 100;

function assertRouteDistance(start, end) {
  const distanceKm = directDistanceKm(start, end);
  if (distanceKm > MAX_ROUTE_DIRECT_DISTANCE_KM) {
    throw new Error(`Start and destination are too far apart for hiking route planning. Choose two points within ${MAX_ROUTE_DIRECT_DISTANCE_KM} km of each other.`);
  }
  if (distanceKm * 1000 < MIN_ROUTE_DIRECT_DISTANCE_M) {
    throw new Error('Start and destination are too close together. Choose two distinct points at least 100 m apart.');
  }
}

async function loadLatestHazards() {
  const snapshot = await getLatestHazardSnapshot();
  const official = snapshot?.hazards?.length ? snapshot.hazards : [];
  const manual = await listManualHazards({ includeInactive: false });
  const reportsPayload = await listCommunityReports(300);
  const reports = (reportsPayload?.reports || []).map((report) => ({
    id: report.id,
    type: report.hazardType || 'other',
    severity: report.severity || 'moderate',
    title: report.title || report.locationName || 'Community report',
    description: report.description || '',
    source: 'Community Report',
    updatedAt: report.reportedAt,
    coordinates: [report.latitude, report.longitude],
  }));

  return [...official, ...manual, ...reports];
}

function geometrySignature(geometry = []) {
  if (!Array.isArray(geometry) || geometry.length < 2) return '';
  const first = geometry[0];
  const last = geometry[geometry.length - 1];
  const midIndex = Math.floor(geometry.length / 2);
  const quarterIndex = Math.floor(geometry.length / 4);
  const threeQuarterIndex = Math.floor((geometry.length * 3) / 4);
  return [first, geometry[quarterIndex], geometry[midIndex], geometry[threeQuarterIndex], last]
    .map((point) => (Array.isArray(point) ? point.map((v) => Number(v).toFixed(3)).join(',') : ''))
    .join('|');
}

function dedupeRoutes(routes) {
  const seen = new Set();
  const unique = [];
  routes.forEach((route) => {
    const signature = geometrySignature(route.geometry);
    const key = `${signature}:${route.distanceKm}:${route.durationMin}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(route);
    }
  });
  return unique;
}

async function buildCandidateRoutes(start, end) {
  const baseRoutes = await fetchOpenRouteServiceRoutes([start, end], { alternatives: true });
  const candidates = [...baseRoutes];

  if (candidates.length < 3) {
    const detours = buildDetourWaypointCandidates(start, end);
    const detourRoutes = await Promise.all(
      detours.map((waypoint) =>
        fetchOpenRouteServiceRoutes([start, waypoint, end], { alternatives: false }).catch(() => []),
      ),
    );
    detourRoutes.flat().forEach((route) => candidates.push(route));
  }

  return dedupeRoutes(candidates)
    .slice(0, MAX_CANDIDATES)
    .map((route, index) => ({
      ...route,
      id: `route-${index + 1}`,
    }));
}

function refitDurationWithGeography(route, geographyProfile, userLevel) {
  const refitted = estimateHikingDurationMin({
    distanceKm: route.distanceKm,
    geographyProfile,
    userLevel,
    fallbackSpeedKmh: config.hikingBaseSpeedKmh,
    floorMin: route.rawDurationMin || 0,
  });
  const finalDuration = Math.max(
    Number(route.rawDurationMin || 0),
    Number(refitted || 0),
  );
  return {
    ...route,
    durationMin: Number(Number(finalDuration).toFixed(1)),
    refittedDurationMin: refitted,
  };
}

function toRoutePayload(route) {
  return {
    id: route.id,
    geometry: route.geometry,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    difficulty: route.difficulty,
    riskScore: route.riskScore,
    riskLevel: route.riskLevel,
    goNoGo: route.goNoGo,
    safetyStatus: route.safetyStatus || (route.goNoGo === 'No-Go' ? 'Dangerous' : 'Safe'),
    noGoReasons: route.noGoReasons || {},
    intro: route.intro || '',
    explanation: route.explanation,
    keyRisks: route.keyRisks,
    zoneSummary: route.zoneSummary,
    suggestedPrep: route.suggestedPrep,
    geographyProfile: route.geographyProfile,
    scoringBreakdown: route.scoringBreakdown || {},
  };
}

async function attachRouteIntroductions(payload) {
  const byId = new Map();
  const allRoutes = [
    payload.recommendedRoute,
    ...(payload.alternatives || []),
    ...(payload.routeOptions || []),
  ].filter(Boolean);

  await Promise.all(
    allRoutes.map(async (route) => {
      if (!route?.id || byId.has(route.id)) return;
      byId.set(route.id, await generateRouteIntroduction({
        ...route,
        hikerExperienceLevel: payload.userLevel,
      }));
    }),
  );

  const decorate = (route) => {
    if (!route) return route;
    return { ...route, intro: byId.get(route.id) || route.intro || '' };
  };

  return {
    recommendedRoute: decorate(payload.recommendedRoute),
    alternatives: (payload.alternatives || []).map(decorate),
    routeOptions: (payload.routeOptions || []).map(decorate),
  };
}

function pickDifficultyRouteOptions(scoredRoutes, { userLevel, userProfile, now } = {}) {
  const desired = ['Easy', 'Moderate', 'Hard'];
  const selected = [];
  const usedIds = new Set();

  desired.forEach((difficulty) => {
    const hit = scoredRoutes.find((route) => route.difficulty === difficulty && !usedIds.has(route.id));
    if (!hit) return;
    usedIds.add(hit.id);
    selected.push({ slot: difficulty, route: hit });
  });

  if (selected.length < 3) {
    scoredRoutes.forEach((route) => {
      if (selected.length >= 3 || usedIds.has(route.id)) return;
      usedIds.add(route.id);
      const nextSlot = desired[selected.length] || route.difficulty || 'Moderate';
      selected.push({ slot: nextSlot, route });
    });
  }

  return selected.slice(0, 3).map(({ slot, route }) => {
    // Re-derive suggestedPrep so the Easy / Moderate / Hard slots each surface
    // tier-appropriate advice — otherwise a Hard-slot route with an inherent
    // "Moderate" label would inherit Moderate-tier tips.
    const tieredPrep = buildSuggestedPrep({
      route,
      userLevel,
      userProfile,
      keyRisks: route.keyRisks,
      riskScore: route.riskScore,
      goNoGo: route.goNoGo,
      geographyProfile: route.geographyProfile,
      difficultyTier: slot,
      now,
    });
    return {
      targetDifficulty: slot,
      ...toRoutePayload({ ...route, suggestedPrep: tieredPrep }),
    };
  });
}

function burdenRatio(route, fastestRoute) {
  const fastestDistance = Math.max(fastestRoute?.distanceKm || 1, 0.1);
  const fastestDuration = Math.max(fastestRoute?.durationMin || 1, 0.1);
  const extraDistance = Math.max(0, (route.distanceKm || 0) - fastestDistance) / fastestDistance;
  const extraDuration = Math.max(0, (route.durationMin || 0) - fastestDuration) / fastestDuration;
  return 0.5 * extraDistance + 0.5 * extraDuration;
}

function compositeSelectionScore(route, fastestRoute) {
  // Prefer routes with low risk AND that don't balloon the trip compared to
  // the fastest routing option. A 0-20 point tax per 100% extra burden keeps the
  // tie-breaker mild — hazard avoidance still dominates.
  const ratio = burdenRatio(route, fastestRoute);
  const burdenPenalty = Math.min(20, ratio * 20);
  return Number(route.riskScore || 0) + burdenPenalty;
}

export async function planSaferRoute({ userId, start, end, now = new Date() }) {
  const normalizedStart = assertCoordinate(start, 'start');
  const normalizedEnd = assertCoordinate(end, 'end');
  assertRouteDistance(normalizedStart, normalizedEnd);

  const userProfile = userId ? await getRouteContextByUserId(userId) : null;
  const userLevel = userProfile?.experienceLevel || 'newcomer';

  const candidates = await buildCandidateRoutes(normalizedStart, normalizedEnd);
  if (!candidates.length) {
    throw new Error('OpenRouteService route service unavailable for the selected points');
  }

  const hazards = await loadLatestHazards();

  const candidatesWithGeography = await Promise.all(
    candidates.map(async (route) => {
      const geographyProfile = await getRouteGeographyProfileForRoute(route);
      const refitted = refitDurationWithGeography(route, geographyProfile, userLevel);
      return { route: refitted, geographyProfile };
    }),
  );

  const routesForFastest = candidatesWithGeography.map(({ route }) => route);
  const fastestRoute = [...routesForFastest].sort((a, b) => a.durationMin - b.durationMin)[0];

  const scored = candidatesWithGeography.map(({ route, geographyProfile }) =>
    scoreRouteCandidate({
      route,
      hazards,
      userLevel,
      userProfile,
      fastestRoute,
      geographyProfile,
      now,
    }),
  );

  // Primary: pick the route with the best combined risk + burden profile. This
  // avoids the situation where the "safest" route is a 4-hour detour that
  // barely reduces risk vs. the fastest route.
  const sortedForRecommendation = [...scored]
    .map((route) => ({ route, compositeScore: compositeSelectionScore(route, fastestRoute) }))
    .sort((a, b) => {
      if (a.route.goNoGo !== b.route.goNoGo) {
        return a.route.goNoGo === 'Go' ? -1 : 1;
      }
      if (a.compositeScore !== b.compositeScore) {
        return a.compositeScore - b.compositeScore;
      }
      return a.route.riskScore - b.route.riskScore;
    })
    .map(({ route }) => route);

  const recommendedRoute = sortedForRecommendation[0];
  const alternatives = sortedForRecommendation.slice(1).map((route) => toRoutePayload(route));

  // Difficulty-slot picker uses pure risk order so the 3 options reflect the
  // safest-first ranking, not the composite tie-breaker above.
  const scoredByRisk = [...scored].sort((a, b) => a.riskScore - b.riskScore);
  const routeOptions = pickDifficultyRouteOptions(scoredByRisk, { userLevel, userProfile, now });

  const payload = {
    userLevel,
    recommendedRoute: toRoutePayload(recommendedRoute),
    alternatives,
    routeOptions,
    scoringBreakdown: recommendedRoute.scoringBreakdown,
  };

  const withIntroductions = await attachRouteIntroductions(payload);
  return {
    ...payload,
    ...withIntroductions,
  };
}
