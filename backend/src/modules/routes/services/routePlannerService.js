import { getLatestHazardSnapshot } from '../../../infrastructure/db/hazardSnapshotRepository.js';
import { getProfileByUserId } from '../../auth/services/authService.js';
import { fetchOsrmRoutes } from '../adapters/osrmAdapter.js';
import { listCommunityReports } from '../../communityReports/repositories/communityReportRepository.js';
import { listManualHazards } from '../../hazards/repositories/manualHazardRepository.js';
import { buildDetourWaypointCandidates, scoreRouteCandidate } from '../domain/routeRisk.js';
import { getRouteGeographyProfileForRoute } from './routeGeographyService.js';

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

async function buildCandidateRoutes(start, end) {
  const baseRoutes = await fetchOsrmRoutes([start, end], { alternatives: true });
  const candidates = [...baseRoutes];

  if (candidates.length < 3) {
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
    explanation: route.explanation,
    keyRisks: route.keyRisks,
    zoneSummary: route.zoneSummary,
    suggestedPrep: route.suggestedPrep,
    geographyProfile: route.geographyProfile,
  };
}

function pickDifficultyRouteOptions(scoredRoutes) {
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

  return selected.slice(0, 3).map(({ slot, route }) => ({
    targetDifficulty: slot,
    ...toRoutePayload(route),
  }));
}

export async function planSaferRoute({ userId, start, end }) {
  const normalizedStart = assertCoordinate(start, 'start');
  const normalizedEnd = assertCoordinate(end, 'end');

  const user = userId ? await getProfileByUserId(userId) : null;
  const userLevel = user?.experienceLevel || 'newcomer';

  const candidates = await buildCandidateRoutes(normalizedStart, normalizedEnd);
  if (!candidates.length) {
    throw new Error('OSRM route service unavailable for the selected points');
  }

  const hazards = await loadLatestHazards();
  const fastestRoute = [...candidates].sort((a, b) => a.durationMin - b.durationMin)[0];
  const scored = await Promise.all(
    candidates.map(async (route) => {
      const geographyProfile = await getRouteGeographyProfileForRoute(route);
      return scoreRouteCandidate({
        route,
        hazards,
        userLevel,
        fastestRoute,
        geographyProfile,
      });
    })
  );
  scored.sort((a, b) => a.riskScore - b.riskScore);

  const recommendedRoute = scored[0];
  const alternatives = scored.slice(1).map((route) => toRoutePayload(route));
  const routeOptions = pickDifficultyRouteOptions(scored);

  return {
    userLevel,
    recommendedRoute: toRoutePayload(recommendedRoute),
    alternatives,
    routeOptions,
    scoringBreakdown: recommendedRoute.scoringBreakdown
  };
}
