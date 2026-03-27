import { getLatestHazardSnapshot } from '../../../infrastructure/db/hazardSnapshotRepository.js';
import { getProfileByUserId } from '../../auth/services/authService.js';
import { fetchOsrmRoutes } from '../adapters/osrmAdapter.js';
import { buildDetourWaypointCandidates, scoreRouteCandidate } from '../domain/routeRisk.js';

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

async function loadLatestHazards() {
  const snapshot = await getLatestHazardSnapshot();
  if (!snapshot?.hazards?.length) return [];
  return snapshot.hazards;
}

async function buildCandidateRoutes(start, end) {
  const baseRoutes = await fetchOsrmRoutes([start, end], { alternatives: true });
  const candidates = [...baseRoutes];

  if (candidates.length < 2) {
    const detours = buildDetourWaypointCandidates(start, end);
    const detourRoutes = await Promise.all(
      detours.map((waypoint) => fetchOsrmRoutes([start, waypoint, end], { alternatives: false }))
    );
    detourRoutes.flat().forEach((route) => candidates.push(route));
  }

  const unique = [];
  const seen = new Set();
  candidates.forEach((route) => {
    const key = `${route.distanceKm}-${route.durationMin}-${route.geometry?.length || 0}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(route);
    }
  });

  return unique.slice(0, 4).map((route, index) => ({
    ...route,
    id: `route-${index + 1}`
  }));
}

export async function planSaferRoute({ userId, start, end }) {
  const normalizedStart = assertCoordinate(start, 'start');
  const normalizedEnd = assertCoordinate(end, 'end');

  const user = await getProfileByUserId(userId);
  if (!user) throw new Error('User not found');

  const candidates = await buildCandidateRoutes(normalizedStart, normalizedEnd);
  if (!candidates.length) {
    throw new Error('OSRM route service unavailable for the selected points');
  }

  const hazards = await loadLatestHazards();
  const fastestRoute = [...candidates].sort((a, b) => a.durationMin - b.durationMin)[0];
  const scored = candidates.map((route) =>
    scoreRouteCandidate({
      route,
      hazards,
      userLevel: user.experienceLevel,
      fastestRoute
    })
  );
  scored.sort((a, b) => a.riskScore - b.riskScore);

  const recommendedRoute = scored[0];
  const alternatives = scored.slice(1).map((route) => ({
    id: route.id,
    geometry: route.geometry,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    riskScore: route.riskScore,
    riskLevel: route.riskLevel
  }));

  return {
    userLevel: user.experienceLevel,
    recommendedRoute: {
      id: recommendedRoute.id,
      geometry: recommendedRoute.geometry,
      distanceKm: recommendedRoute.distanceKm,
      durationMin: recommendedRoute.durationMin,
      difficulty: recommendedRoute.difficulty,
      riskScore: recommendedRoute.riskScore,
      riskLevel: recommendedRoute.riskLevel,
      goNoGo: recommendedRoute.goNoGo,
      explanation: recommendedRoute.explanation,
      keyRisks: recommendedRoute.keyRisks,
      suggestedPrep: recommendedRoute.suggestedPrep
    },
    alternatives,
    scoringBreakdown: recommendedRoute.scoringBreakdown
  };
}
