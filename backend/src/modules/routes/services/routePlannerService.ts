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
import type {
  Coordinate,
  GeographyProfile,
  Hazard,
  PlanRouteResponse,
  RouteCandidate,
  RouteOption,
  RoutePayload,
  User,
  UserLevel,
} from 'hikeshield-shared';

const MAX_CANDIDATES = 6;
const MAX_ROUTE_DIRECT_DISTANCE_KM = 80;
const MIN_ROUTE_DIRECT_DISTANCE_M = 100;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function directDistanceKm(start: Coordinate, end: Coordinate): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function assertCoordinate(point: unknown, fieldName: string): Coordinate {
  const p = point as Record<string, unknown>;
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${fieldName} must include numeric lat/lng`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${fieldName} coordinate is out of range`);
  }
  return { lat, lng };
}

function assertRouteDistance(start: Coordinate, end: Coordinate): void {
  const distanceKm = directDistanceKm(start, end);
  if (distanceKm > MAX_ROUTE_DIRECT_DISTANCE_KM) {
    throw new Error(
      `Start and destination are too far apart for hiking route planning. Choose two points within ${MAX_ROUTE_DIRECT_DISTANCE_KM} km of each other.`,
    );
  }
  if (distanceKm * 1000 < MIN_ROUTE_DIRECT_DISTANCE_M) {
    throw new Error(
      'Start and destination are too close together. Choose two distinct points at least 100 m apart.',
    );
  }
}

interface SimpleHazard extends Hazard {
  feelsLike?: number;
}

async function loadLatestHazards(): Promise<SimpleHazard[]> {
  const snapshot = await getLatestHazardSnapshot();
  const official: SimpleHazard[] = snapshot?.hazards?.length ? snapshot.hazards : [];
  const manual = await listManualHazards({ includeInactive: false });
  const reportsPayload = await listCommunityReports(300);
  const reports: SimpleHazard[] = (reportsPayload?.reports || []).map(
    (report: Record<string, unknown>) => ({
      id: report.id as string,
      type: (report.hazardType as Hazard['type']) || 'other',
      severity: (report.severity as Hazard['severity']) || 'moderate',
      title: (report.title as string) || (report.locationName as string) || 'Community report',
      description: (report.description as string) || '',
      source: 'Community Report',
      updatedAt: report.reportedAt as string,
      coordinates: [report.latitude as number, report.longitude as number] as [number, number],
    }),
  );

  return [...official, ...manual, ...reports] as SimpleHazard[];
}

interface RouteShape {
  geometry?: number[][];
  distanceKm?: number;
  durationMin?: number;
  id?: string;
  rawDurationMin?: number;
  difficulty?: string;
}

function geometrySignature(geometry: number[][] = []): string {
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

function dedupeRoutes(routes: RouteShape[]): RouteShape[] {
  const seen = new Set<string>();
  const unique: RouteShape[] = [];
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

async function buildCandidateRoutes(start: Coordinate, end: Coordinate): Promise<RouteShape[]> {
  const baseRoutes = await fetchOpenRouteServiceRoutes([start, end], { alternatives: true });
  const candidates: RouteShape[] = [...baseRoutes];

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

function refitDurationWithGeography(
  route: RouteShape,
  geographyProfile: GeographyProfile,
  userLevel: UserLevel,
): RouteShape & { refittedDurationMin?: number } {
  const refitted = estimateHikingDurationMin({
    distanceKm: route.distanceKm ?? 0,
    geographyProfile,
    userLevel,
    fallbackSpeedKmh: config.hikingBaseSpeedKmh,
    floorMin: route.rawDurationMin || 0,
  });
  const finalDuration = Math.max(Number(route.rawDurationMin || 0), Number(refitted || 0));
  return {
    ...route,
    durationMin: Number(Number(finalDuration).toFixed(1)),
    refittedDurationMin: refitted,
  };
}

function toRoutePayload(route: RouteCandidate): RoutePayload {
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
    noGoReasons: route.noGoReasons || ({} as RouteCandidate['noGoReasons']),
    intro: route.intro || '',
    explanation: route.explanation,
    keyRisks: route.keyRisks,
    zoneSummary: route.zoneSummary,
    suggestedPrep: route.suggestedPrep,
    geographyProfile: route.geographyProfile,
    scoringBreakdown: route.scoringBreakdown || ({} as RouteCandidate['scoringBreakdown']),
  };
}

async function attachRouteIntroductions(
  recommendedRoute: RoutePayload,
  alternatives: RoutePayload[],
  routeOptions: RouteOption[],
  userLevel: UserLevel,
): Promise<{
  recommendedRoute: RoutePayload;
  alternatives: RoutePayload[];
  routeOptions: RouteOption[];
}> {
  const byId = new Map<string, string>();
  const allRoutes = [recommendedRoute, ...alternatives, ...routeOptions].filter(Boolean);

  await Promise.all(
    allRoutes.map(async (route) => {
      if (!route?.id || byId.has(route.id)) return;
      byId.set(
        route.id,
        await generateRouteIntroduction({
          ...route,
          hikerExperienceLevel: userLevel,
        } as Parameters<typeof generateRouteIntroduction>[0]),
      );
    }),
  );

  const decorate = <T extends RoutePayload>(route: T): T => {
    const intro = byId.get(route.id) || route.intro || '';
    return { ...route, intro } as T;
  };

  return {
    recommendedRoute: decorate(recommendedRoute),
    alternatives: alternatives.map(decorate),
    routeOptions: routeOptions.map(decorate),
  };
}

const difficultySlots: RouteOption['targetDifficulty'][] = ['Easy', 'Moderate', 'Hard'];
const difficultyRank: Record<string, number> = { Easy: 0, Moderate: 1, Hard: 2 };
const riskRank: Record<string, number> = { Low: 0, Moderate: 1, High: 2, Extreme: 3 };

function routeOptionBurdenScore(route: RouteCandidate): number {
  const burdenScore = Number(route.scoringBreakdown?.burdenScore ?? 0);
  const effortScore = Number(route.scoringBreakdown?.routeEffort ?? 0);
  const riskScore = Number(route.riskScore ?? 0);
  const routeDifficultyRank = difficultyRank[route.difficulty] ?? 1;
  const routeRiskRank = riskRank[route.riskLevel] ?? 0;
  const noGoPenalty = route.goNoGo === 'No-Go' ? 100 : 0;
  const distancePenalty = Math.max(0, Number(route.distanceKm || 0) - 8) * 1.2;
  const durationPenalty = Math.max(0, Number(route.durationMin || 0) - 150) / 10;

  return (
    noGoPenalty +
    routeRiskRank * 24 +
    riskScore * 0.35 +
    burdenScore * 0.45 +
    effortScore * 0.3 +
    routeDifficultyRank * 12 +
    distancePenalty +
    durationPenalty
  );
}

export function pickDifficultyRouteOptions(
  scoredRoutes: RouteCandidate[],
  opts?: { userLevel?: UserLevel; userProfile?: User | null; now?: Date },
): RouteOption[] {
  const { userLevel, userProfile, now } = opts || {};
  const selected = [...scoredRoutes]
    .sort((a, b) => {
      const aScore = routeOptionBurdenScore(a);
      const bScore = routeOptionBurdenScore(b);
      if (aScore !== bScore) return aScore - bScore;
      if ((a.distanceKm || 0) !== (b.distanceKm || 0)) return (a.distanceKm || 0) - (b.distanceKm || 0);
      return (a.durationMin || 0) - (b.durationMin || 0);
    })
    .slice(0, 3)
    .map((route, index) => ({
      slot: difficultySlots[index] || route.difficulty || 'Moderate',
      route,
    }));

  return selected.slice(0, 3).map(({ slot, route }) => {
    const tieredPrep = buildSuggestedPrep({
      route,
      userLevel: userLevel ?? 'newcomer',
      userProfile: userProfile as unknown as User | null,
      keyRisks: route.keyRisks,
      riskScore: route.riskScore,
      goNoGo: route.goNoGo,
      geographyProfile: route.geographyProfile,
      difficultyTier: slot as RouteCandidate['difficulty'],
      now,
    });
    return {
      targetDifficulty: slot as RouteOption['targetDifficulty'],
      ...toRoutePayload({ ...route, suggestedPrep: tieredPrep }),
    } as RouteOption;
  });
}

function burdenRatio(route: RouteCandidate, fastestRoute: RouteCandidate): number {
  const fastestDistance = Math.max(fastestRoute?.distanceKm || 1, 0.1);
  const fastestDuration = Math.max(fastestRoute?.durationMin || 1, 0.1);
  const extraDistance = Math.max(0, (route.distanceKm || 0) - fastestDistance) / fastestDistance;
  const extraDuration = Math.max(0, (route.durationMin || 0) - fastestDuration) / fastestDuration;
  return 0.5 * extraDistance + 0.5 * extraDuration;
}

function compositeSelectionScore(route: RouteCandidate, fastestRoute: RouteCandidate): number {
  const ratio = burdenRatio(route, fastestRoute);
  const burdenPenalty = Math.min(20, ratio * 20);
  return Number(route.riskScore || 0) + burdenPenalty;
}

export interface PlanSaferRouteParams {
  userId: string | null;
  start: Coordinate;
  end: Coordinate;
  now?: Date;
}

export async function planSaferRoute({
  userId,
  start,
  end,
  now = new Date(),
}: PlanSaferRouteParams): Promise<PlanRouteResponse & { userLevel: UserLevel }> {
  const normalizedStart = assertCoordinate(start, 'start');
  const normalizedEnd = assertCoordinate(end, 'end');
  assertRouteDistance(normalizedStart, normalizedEnd);

  const userProfile = userId ? await getRouteContextByUserId(userId) : null;
  const userLevel: UserLevel = userProfile?.experienceLevel || 'newcomer';

  const candidates = await buildCandidateRoutes(normalizedStart, normalizedEnd);
  if (!candidates.length) {
    throw new Error('OpenRouteService route service unavailable for the selected points');
  }

  const hazards = await loadLatestHazards();

  const maxFeelsLike = hazards.reduce<number | null>((max, hazard) => {
    const temp = Number(hazard.feelsLike);
    return Number.isFinite(temp) && (max === null || temp > max) ? temp : max;
  }, null);

  const candidatesWithGeography = await Promise.all(
    candidates.map(async (route) => {
      const geographyProfile = await getRouteGeographyProfileForRoute(route);
      const refitted = refitDurationWithGeography(route, geographyProfile, userLevel);
      return { route: refitted, geographyProfile };
    }),
  );

  const routesForFastest = candidatesWithGeography.map(({ route }) => route as unknown as RouteCandidate);
  const fastestRoute = [...routesForFastest].sort(
    (a, b) => (a.durationMin ?? 0) - (b.durationMin ?? 0),
  )[0];

  const scored = candidatesWithGeography.map(({ route, geographyProfile }) =>
    scoreRouteCandidate({
      route: route as unknown as RouteCandidate,
      hazards,
      userLevel,
      userProfile: userProfile as unknown as User | null,
      fastestRoute,
      geographyProfile,
      now,
      maxFeelsLike,
      candidateCount: candidatesWithGeography.length,
    }),
  );

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

  const scoredByRisk = [...scored].sort((a, b) => a.riskScore - b.riskScore);
  const routeOptions = pickDifficultyRouteOptions(scoredByRisk, {
    userLevel,
    userProfile: userProfile as unknown as User | null,
    now,
  });

  const recommendedPayload = toRoutePayload(recommendedRoute);

  const withIntroductions = await attachRouteIntroductions(
    recommendedPayload,
    alternatives,
    routeOptions,
    userLevel,
  );

  return {
    userLevel,
    recommendedRoute: withIntroductions.recommendedRoute,
    alternatives: withIntroductions.alternatives,
    routeOptions: withIntroductions.routeOptions,
    scoringBreakdown: recommendedRoute.scoringBreakdown,
  };
}
