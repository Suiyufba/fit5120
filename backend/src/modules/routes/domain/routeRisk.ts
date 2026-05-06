import type {
  Coordinate,
  Difficulty,
  GeographyProfile,
  GoNoGo,
  Hazard,
  HazardSeverity,
  HazardType,
  KeyRisk,
  NoGoReasons,
  RiskLevel,
  RouteCandidate,
  RouteGeometry,
  ScoringBreakdown,
  User,
  UserLevel,
  ZoneSummary,
} from 'hikeshield-shared';

const SEVERITY_BASE: Record<string, number> = {
  low: 20,
  moderate: 50,
  high: 80,
  extreme: 100,
};

const TYPE_FACTOR: Record<string, number> = {
  fire: 1.3,
  flood: 1.1,
  storm: 1.05,
  heat: 0.95,
  trail: 1.0,
  other: 0.85,
};

const USER_RISK_FACTOR: Record<string, number> = {
  newcomer: 1.12,
  intermediate: 1.0,
  advanced: 0.9,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toLocalXY([lat, lng]: [number, number], referenceLat: number): [number, number] {
  const x = lng * 111.32 * Math.cos(toRad(referenceLat));
  const y = lat * 111.32;
  return [x, y];
}

function pointToSegmentDistanceKm(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number],
): number {
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

export function distanceToRouteKm(point: [number, number], geometry: RouteGeometry): number {
  if (!Array.isArray(geometry) || geometry.length < 2) return Infinity;

  let minDistance = Infinity;
  for (let i = 0; i < geometry.length - 1; i += 1) {
    const nextDistance = pointToSegmentDistanceKm(point, geometry[i], geometry[i + 1]);
    if (nextDistance < minDistance) minDistance = nextDistance;
  }
  return minDistance;
}

function distanceFactor(distanceKm: number): number {
  if (distanceKm <= 0.5) return 1.0;
  if (distanceKm <= 1.5) return 0.78;
  if (distanceKm <= 3) return 0.55;
  if (distanceKm <= 5) return 0.35;
  if (distanceKm <= 8) return 0.18;
  return 0;
}

type ZoneLevel = 1 | 2 | 3 | 0;

function zoneLevelByDistance(distanceKm: number): ZoneLevel {
  if (distanceKm <= 1) return 1;
  if (distanceKm <= 3) return 2;
  if (distanceKm <= 5) return 3;
  return 0;
}

function zoneLabel(level: ZoneLevel): string {
  if (level === 1) return 'Level 1 Core Risk Zone';
  if (level === 2) return 'Level 2 Buffer Risk Zone';
  if (level === 3) return 'Level 3 Watch Risk Zone';
  return 'Outside Risk Zone';
}

interface HazardImpact {
  hazard: Hazard;
  distanceKm: number;
  impact: number;
}

interface CoverageImpact extends HazardImpact {
  zoneLevel: ZoneLevel;
}

function toHazardImpact(hazard: Hazard, distanceKm: number, now: Date | string): number {
  const base = SEVERITY_BASE[hazard.severity] ?? 20;
  const factor = TYPE_FACTOR[hazard.type] ?? TYPE_FACTOR.other;
  const impact = base * distanceFactor(distanceKm) * factor * recencyFactor(hazard.updatedAt, now);
  return clamp(impact);
}

function recencyFactor(updatedAt: string, now: Date | string = new Date()): number {
  const ts = Date.parse(updatedAt || '');
  if (Number.isNaN(ts)) return 0.6;

  const referenceMs = now instanceof Date ? now.getTime() : Date.parse(String(now || ''));
  const nowMs = Number.isFinite(referenceMs) ? referenceMs : Date.now();
  const ageHours = Math.max(0, (Number(nowMs) - Number(ts)) / (1000 * 60 * 60));
  if (ageHours <= 6) return 1.0;
  if (ageHours <= 24) return 0.85;
  if (ageHours <= 72) return 0.65;
  if (ageHours <= 24 * 7) return 0.45;
  if (ageHours <= 24 * 14) return 0.3;
  if (ageHours <= 24 * 30) return 0.15;
  return 0;
}

interface ImpactResult {
  score: number;
  impacts: HazardImpact[];
}

function topImpactAverage(
  hazards: Hazard[],
  geometry: RouteGeometry,
  filterFn: (h: Hazard) => boolean,
  now: Date,
): ImpactResult {
  const impacts = hazards
    .filter(filterFn)
    .map((hazard) => {
      const distanceKm = distanceToRouteKm(hazard.coordinates, geometry);
      return {
        hazard,
        distanceKm,
        impact: toHazardImpact(hazard, distanceKm, now),
      };
    })
    .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= 8 && item.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6);

  if (!impacts.length) {
    return { score: 0, impacts: [] };
  }

  const avg = impacts.reduce((sum, item) => sum + item.impact, 0) / impacts.length;
  const densityBoost = Math.min(1.85, 0.78 + impacts.length * 0.18);
  return {
    score: clamp(avg * densityBoost),
    impacts,
  };
}

function collectCoverageImpacts(
  hazards: Hazard[],
  geometry: RouteGeometry,
  filterFn: (h: Hazard) => boolean,
  now: Date,
): CoverageImpact[] {
  return hazards
    .filter(filterFn)
    .map((hazard) => {
      const distanceKm = distanceToRouteKm(hazard.coordinates, geometry);
      const zoneLevel = zoneLevelByDistance(distanceKm);
      return {
        hazard,
        distanceKm,
        zoneLevel,
        impact: toHazardImpact(hazard, distanceKm, now),
      };
    })
    .filter((item) => Number.isFinite(item.distanceKm) && item.zoneLevel > 0)
    .sort((a, b) => {
      if (a.zoneLevel !== b.zoneLevel) return a.zoneLevel - b.zoneLevel;
      return b.impact - a.impact;
    });
}

function distanceEnduranceScore(distanceKm: number): number {
  const d = Math.max(distanceKm || 0, 0);
  if (d <= 8) return d * 3.5;
  if (d <= 20) return 28 + (d - 8) * 2.25;
  if (d <= 40) return 55 + (d - 20) * 1.5;
  if (d <= 70) return 85 + (d - 40) * 0.4;
  return clamp(97 + Math.log1p(d - 70) * 1.6);
}

function durationExposureScore(durationMin: number): number {
  const mins = Math.max(durationMin || 0, 0);
  if (mins <= 120) return mins * 0.25;
  if (mins <= 360) return 30 + (mins - 120) * 0.16;
  if (mins <= 720) return 68.4 + (mins - 360) * 0.06;
  return clamp(90 + Math.log1p(mins - 720) * 1.7);
}

function routeBurdenScore(route: { distanceKm?: number; durationMin?: number }): number {
  const distanceScore = distanceEnduranceScore(route.distanceKm || 0);
  const durationScore = durationExposureScore(route.durationMin || 0);
  return clamp(0.47 * distanceScore + 0.53 * durationScore);
}

function coverageZoneScore(coverageImpacts: CoverageImpact[]): number {
  if (!coverageImpacts.length) return 0;

  let total = 0;
  coverageImpacts.forEach((item, index) => {
    const base = item.zoneLevel === 1 ? 30 : item.zoneLevel === 2 ? 14 : 6;
    const severityFactor = (SEVERITY_BASE[item.hazard.severity] ?? 20) / 100;
    const decay = Math.max(0.35, 1 - index * 0.14);
    total += base * severityFactor * decay;
  });

  return clamp(total);
}

function feasibilityPenaltyScore(route: { distanceKm?: number; durationMin?: number }): number {
  const distanceKm = Math.max(route.distanceKm || 0, 0);
  const durationMin = Math.max(route.durationMin || 0, 0);
  const extraDistance = Math.max(0, distanceKm - 25);
  const extraDurationHours = Math.max(0, (durationMin - 360) / 60);
  return clamp(extraDistance * 0.7 + extraDurationHours * 4.5, 0, 40);
}

function terrainPenalty(surfaceType?: string, trailCondition?: string): number {
  const roughSurfaces = new Set(['gravel', 'rock', 'ground', 'dirt', 'mud', 'sand', 'pebblestone']);
  const poorConditions = new Set(['bad', 'very_bad', 'horrible', 'no', 'intermediate', 'poor']);

  let score = 0;
  if (roughSurfaces.has(String(surfaceType || '').toLowerCase())) score += 16;
  if (poorConditions.has(String(trailCondition || '').toLowerCase())) score += 24;
  return clamp(score, 0, 30);
}

function riskLevelByScore(score: number): RiskLevel {
  if (score >= 85) return 'Extreme';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

function noGoFloorScoreByReason(reasons: NoGoReasons): number {
  if (reasons.hasExtremeTooClose || reasons.hasRouteClosure) return 85;
  if (reasons.hasFireTooClose) return 78;
  if (reasons.hasHighTooClose) return 72;
  if (reasons.hasSevereCliffExposure || reasons.hasSteepTerrainForUser) return 72;
  if (reasons.exceedsDistanceCap || reasons.exceedsDurationCap) return 65;
  if (reasons.exceedsScoreThreshold) return 65;
  return 0;
}

function difficultyLabel(burdenScore: number, geographyProfile: GeographyProfile | null): Difficulty {
  const ascentScore = clamp((Number(geographyProfile?.totalAscentM || 0) / 900) * 100);
  const slopeScore = clamp((Number(geographyProfile?.maxSlopePct || 0) / 28) * 100);
  const terrainScore =
    terrainPenalty(geographyProfile?.surfaceType, geographyProfile?.trailCondition) * (100 / 30);
  const fatigueIndex = clamp(0.5 * ascentScore + 0.35 * slopeScore + 0.15 * terrainScore);

  const composite = clamp(0.6 * (Number(burdenScore) || 0) + 0.4 * fatigueIndex);

  if (composite >= 72) return 'Hard';
  if (composite >= 38) return 'Moderate';
  return 'Easy';
}

interface GoNoGoParams {
  userLevel: UserLevel;
  riskScore: number;
  hazardImpacts: HazardImpact[];
  routeDistanceKm: number;
  routeDurationMin: number;
  geographyProfile?: GeographyProfile | null;
}

interface GoNoGoResult {
  goNoGo: GoNoGo;
  noGoReasons: NoGoReasons;
}

function goNoGoDecision({
  userLevel,
  riskScore,
  hazardImpacts,
  routeDistanceKm,
  routeDurationMin,
  geographyProfile,
}: GoNoGoParams): GoNoGoResult {
  const thresholds = {
    newcomer: { score: 52, extremeDistanceKm: 2, maxDistanceKm: 30, maxDurationMin: 480 },
    intermediate: { score: 66, extremeDistanceKm: 1.5, maxDistanceKm: 45, maxDurationMin: 660 },
    advanced: { score: 78, extremeDistanceKm: 1, maxDistanceKm: 60, maxDurationMin: 840 },
  };
  const current = thresholds[userLevel] || thresholds.newcomer;

  const hasExtremeTooClose = hazardImpacts.some(
    (item) => item.hazard.severity === 'extreme' && item.distanceKm <= current.extremeDistanceKm,
  );
  const hasHighTooClose = hazardImpacts.some(
    (item) => item.hazard.severity === 'high' && item.distanceKm <= 0.5,
  );
  const hasFireTooClose = hazardImpacts.some(
    (item) => item.hazard.type === 'fire' && item.distanceKm <= 1,
  );
  const exceedsDistanceCap = (routeDistanceKm || 0) > current.maxDistanceKm;
  const exceedsDurationCap = (routeDurationMin || 0) > current.maxDurationMin;
  const hasRouteClosure = Number(geographyProfile?.closureCount || 0) > 0;
  const hasSevereCliffExposure =
    userLevel !== 'advanced' && Number(geographyProfile?.cliffExposureCount || 0) >= 2;
  const hasSteepTerrainForUser =
    (userLevel === 'newcomer' && Number(geographyProfile?.maxSlopePct || 0) >= 22) ||
    (userLevel === 'intermediate' && Number(geographyProfile?.maxSlopePct || 0) >= 30);
  const exceedsScoreThreshold = riskScore >= current.score;
  const noGoReasons: NoGoReasons = {
    hasExtremeTooClose,
    hasHighTooClose,
    hasFireTooClose,
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

interface BuildExplanationParams {
  chosenRoute: { durationMin?: number; distanceKm?: number };
  fastestRoute: { durationMin?: number; distanceKm?: number };
  topHazards: HazardImpact[];
  goNoGo: GoNoGo;
  geographyProfile?: GeographyProfile | null;
}

function buildExplanation({
  chosenRoute,
  fastestRoute,
  topHazards,
  goNoGo,
  geographyProfile,
}: BuildExplanationParams): string {
  if (Number(geographyProfile?.closureCount || 0) > 0) {
    return 'Part of this route is currently closed. Please choose another route for now.';
  }

  if ((chosenRoute.durationMin || 0) >= 720 || (chosenRoute.distanceKm || 0) >= 60) {
    return `This route is very long (${(chosenRoute.distanceKm ?? 0).toFixed(1)} km, about ${Math.round((chosenRoute.durationMin ?? 0) / 60)} hours). Consider a shorter route or split this trip into multiple days.`;
  }

  if ((geographyProfile?.riverCrossingCount || 0) > 0 || (geographyProfile?.cliffExposureCount || 0) > 0) {
    const parts: string[] = [];
    if ((geographyProfile?.riverCrossingCount || 0) > 0)
      parts.push(`${geographyProfile!.riverCrossingCount} river/ford crossing areas`);
    if ((geographyProfile?.cliffExposureCount || 0) > 0)
      parts.push(`${geographyProfile!.cliffExposureCount} cliff-exposure sections`);
    return `This route needs extra care because it includes ${parts.join(' and ')}.`;
  }

  if (!topHazards.length) {
    return goNoGo === 'Go'
      ? 'No major hazards were found near this route right now.'
      : 'Risk is still high for this route right now.';
  }

  const first = topHazards[0];
  const reason = `${first.hazard.type} risk is about ${first.distanceKm.toFixed(1)} km from this route`;
  const detourMinutes = Math.max(0, Math.round((chosenRoute.durationMin ?? 0) - (fastestRoute.durationMin ?? 0)));
  if (detourMinutes > 0) {
    return `This route is safer because ${reason}. It adds about ${detourMinutes} minutes.`;
  }
  return `This route is recommended because ${reason}, and the overall risk is lower.`;
}

interface RiskAdviceParams {
  type: HazardType;
  severity: HazardSeverity;
  distanceKm: number;
}

function riskAdviceByType({ type, severity, distanceKm }: RiskAdviceParams): string {
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

function deriveAssessmentGaps(answers: Record<string, string> = {}): string[] {
  const gaps = new Set<string>();
  const normalized = Object.fromEntries(
    Object.entries(answers || {}).map(([k, v]) => [k, String(v || '').toLowerCase()]),
  );
  if (normalized.q_weather === 'a') gaps.add('weather');
  if (normalized.q_injury === 'b') gaps.add('injury');
  if (normalized.q_lost === 'c') gaps.add('navigation');
  if (normalized.q_fire === 'a') gaps.add('fire');
  return Array.from(gaps);
}

type AgeBracket = 'minor' | 'senior' | 'adult' | 'unknown';

function ageBracket(age: number | undefined): AgeBracket {
  const numeric = Number(age);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'unknown';
  if (numeric < 18) return 'minor';
  if (numeric >= 60) return 'senior';
  return 'adult';
}

type Season = 'summer' | 'autumn' | 'winter' | 'spring' | 'unknown';

function seasonFromDate(date: Date | string = new Date()): Season {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const month = d.getMonth();
  if ([11, 0, 1].includes(month)) return 'summer';
  if ([2, 3, 4].includes(month)) return 'autumn';
  if ([5, 6, 7].includes(month)) return 'winter';
  return 'spring';
}

function computeDayMinutes(lat: number, lng: number, date: Date | string): number {
  const d = date instanceof Date ? date : new Date(date);
  const janFirst = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((Number(d) - Number(janFirst)) / (1000 * 60 * 60 * 24)) + 1;
  const latRad = toRad(lat);
  const declination = toRad(23.45) * Math.sin(toRad((360 / 365) * (dayOfYear - 81)));
  const ha = Math.acos(
    clamp(
      (-Math.sin(toRad(-0.83)) - Math.sin(latRad) * Math.sin(declination)) /
        (Math.cos(latRad) * Math.cos(declination)),
      -1,
      1,
    ),
  );
  const solarNoonUtcMinutes = 12 * 60 - (lng / 15) * 60;
  const daylightHalfMinutes = (ha / (2 * Math.PI)) * 24 * 60;
  const sunsetUtcMinutes = solarNoonUtcMinutes + daylightHalfMinutes;
  const tzOffsetHours = -d.getTimezoneOffset() / 60;
  return ((sunsetUtcMinutes / 60) + tzOffsetHours + 24) % 24;
}

function isVictorianRegion(region = ''): boolean {
  const v = String(region || '').trim().toLowerCase();
  if (!v) return true;
  return ['victoria', 'vic', 'melbourne', 'au-vic'].some((token) => v.includes(token));
}

interface PrepTip {
  key: string;
  priority: number;
  text: string;
}

function pushTip(
  list: PrepTip[],
  seen: Set<string>,
  key: string,
  priority: number,
  text: string,
): void {
  if (seen.has(key)) return;
  seen.add(key);
  list.push({ key, priority, text });
}

export interface BuildSuggestedPrepParams {
  route: Partial<RouteCandidate>;
  userLevel: UserLevel;
  userProfile?: User | null;
  keyRisks: KeyRisk[];
  riskScore: number;
  goNoGo: GoNoGo;
  geographyProfile?: GeographyProfile | null;
  difficultyTier?: Difficulty;
  now?: Date;
  maxTips?: number;
}

export function buildSuggestedPrep({
  route,
  userLevel,
  userProfile,
  keyRisks,
  riskScore,
  goNoGo,
  geographyProfile,
  difficultyTier = 'Moderate',
  now,
  maxTips = 7,
}: BuildSuggestedPrepParams): string[] {
  const tips: PrepTip[] = [];
  const seen = new Set<string>();

  const distanceKm = Number(route?.distanceKm || 0);
  const durationMin = Number(route?.durationMin || 0);
  const ascentM = Number(geographyProfile?.totalAscentM || 0);
  const maxSlope = Number(geographyProfile?.maxSlopePct || 0);
  const riverCount = Number(geographyProfile?.riverCrossingCount || 0);
  const cliffCount = Number(geographyProfile?.cliffExposureCount || 0);
  const closureCount = Number(geographyProfile?.closureCount || 0);

  const bracket = ageBracket(userProfile?.age);
  const region = String(userProfile?.region || '');
  const gaps = deriveAssessmentGaps(userProfile?.assessmentAnswers as Record<string, string>);
  const season = seasonFromDate(now);
  const hazardTypes = new Set((keyRisks || []).map((risk) => risk.type));
  const tier: Difficulty = ['Easy', 'Moderate', 'Hard'].includes(difficultyTier)
    ? difficultyTier
    : 'Moderate';

  if (closureCount > 0) {
    pushTip(tips, seen, 'closure', 100,
      'Closure on route: do not try to bypass the barrier. Pick an alternate trail or turn around.',
    );
  }
  if (goNoGo === 'No-Go' || riskScore >= 70) {
    pushTip(tips, seen, 'elevated-risk', 95,
      'Current risk is elevated: consider postponing, shortening, or swapping to a lower-exposure route today.',
    );
  }

  if (tier === 'Hard') {
    pushTip(tips, seen, 'tier-hard-turnaround', 86,
      'Hard route: set a firm objective turn-around time BEFORE starting and commit to it even if the summit is close.',
    );
    pushTip(tips, seen, 'tier-hard-gear', 84,
      'Hard-route gear kit: trekking poles, headlamp (descents often overrun), emergency bivvy/space blanket, full first-aid kit, and 2 layers for weather swing.',
    );
    pushTip(tips, seen, 'tier-hard-comms', 81,
      'Hard-route comms: share your exact GPS track and a check-in window with a contact before losing signal; log with the local ranger if the option exists.',
    );
    pushTip(tips, seen, 'tier-hard-fuel', 77,
      'Hard-route fuel plan: 3 L+ water with a backup purifier tablet, plus 250–400 kcal every 45–60 min to avoid bonking on climbs.',
    );
  } else if (tier === 'Moderate') {
    pushTip(tips, seen, 'tier-moderate-kit', 69,
      'Moderate route: pack 2 L water, trail snacks, and a packable rain layer — weather can turn inside 2 hours up here.',
    );
    pushTip(tips, seen, 'tier-moderate-pace', 67,
      'Moderate pace check: at the halfway mark, reassess time and energy — if either is tight, turn back instead of pushing on.',
    );
  } else {
    pushTip(tips, seen, 'tier-easy-kit', 62,
      'Easy route: comfortable walking shoes, 1 L water, light snacks, and sun protection cover most of today\'s needs.',
    );
    pushTip(tips, seen, 'tier-easy-share', 60,
      'Easy outing safety habit: still share a rough ETA with a friend — takes 10 seconds and catches the rare mishap.',
    );
  }

  if (hazardTypes.has('fire')) {
    pushTip(tips, seen, 'hazard-fire', 92,
      'Fire-aware prep: check VicEmergency fire danger rating before leaving, set a strict turn-around trigger, and verify an evacuation road.',
    );
  }
  if (hazardTypes.has('flood') || hazardTypes.has('storm')) {
    pushTip(tips, seen, 'hazard-weather', 90,
      'Rain/storm prep: waterproof outer shell, dry bag for phone, avoid creek fords and low-lying shortcuts.',
    );
  }
  if (hazardTypes.has('heat')) {
    pushTip(tips, seen, 'hazard-heat', 88,
      'Heat-aware prep: electrolytes, UPF clothing, extra 1L water, and aim to finish exposed sections before 11 am.',
    );
  }

  if (gaps.includes('weather')) {
    pushTip(tips, seen, 'gap-weather', 85,
      'Weather-awareness gap (from your assessment): double-check BOM radar on the morning of, and pre-plan a weather turn-around cue.',
    );
  }
  if (gaps.includes('injury')) {
    pushTip(tips, seen, 'gap-injury', 85,
      'Injury-response gap: carry a compact first-aid kit (bandage + elastic wrap + painkillers) and review how to manage a sprain before you go.',
    );
  }
  if (gaps.includes('navigation')) {
    pushTip(tips, seen, 'gap-navigation', 85,
      'Navigation gap: download an offline map (AllTrails / Gaia), bring a fully-charged power bank, and share your GPS track before starting.',
    );
  }
  if (gaps.includes('fire') && !hazardTypes.has('fire')) {
    pushTip(tips, seen, 'gap-fire', 82,
      'Fire-awareness gap: refresh the Fire Danger Rating system (Moderate/High/Extreme/Catastrophic) and commit to no-go on Extreme+ days.',
    );
  }

  if (bracket === 'minor') {
    pushTip(tips, seen, 'age-minor', 80,
      'Under-18 outing: hike with a guardian or experienced partner, share an exact return time, and carry a whistle.',
    );
  } else if (bracket === 'senior') {
    pushTip(tips, seen, 'age-senior', 80,
      '60+ safety: pace conservatively, carry any daily medication plus a spare dose, and consider trekking poles on descents.',
    );
  }

  if (ascentM >= 700) {
    pushTip(tips, seen, 'effort-ascent', 76,
      `High-ascent route (${Math.round(ascentM)} m climb): fuel up every 45 min, ration water for the climb, and slow the pace on steep pitches.`,
    );
  }
  if (maxSlope >= 22) {
    pushTip(tips, seen, 'effort-slope', 74,
      `Steep section (max ${maxSlope.toFixed(0)}% grade): use trekking poles, sidestep on descents, and avoid loose rock edges.`,
    );
  }
  if (riverCount > 0) {
    pushTip(tips, seen, 'effort-river', 74,
      `River/ford crossing (${riverCount}): test depth with a pole before committing; avoid crossings after heavy rain in the last 24h.`,
    );
  }
  if (cliffCount > 0) {
    pushTip(tips, seen, 'effort-cliff', 72,
      `Cliff exposure (${cliffCount} section${cliffCount > 1 ? 's' : ''}): do not attempt in low visibility; keep a phone/whistle accessible.`,
    );
  }

  if (distanceKm >= 30 || durationMin >= 300) {
    pushTip(tips, seen, 'long-outing', 72,
      'Extended outing: pack an emergency bivvy/thermal blanket, offline map, and plan a realistic bail-out at the midpoint.',
    );
  } else if (distanceKm >= 20) {
    pushTip(tips, seen, 'long-distance', 68,
      'Long-distance hike: bring 2.5 L+ water, blister care (tape/leukotape), and a protein-rich lunch.',
    );
  } else if (durationMin >= 180) {
    pushTip(tips, seen, 'long-duration', 64,
      'Multi-hour route: carry a headlamp + power bank in case the return runs late.',
    );
  }

  if (season === 'summer') {
    pushTip(tips, seen, 'season-summer', 66,
      'Australian summer: start before 7 am to beat heat, carry extra electrolytes, and watch for snakes on the trail edge.',
    );
  } else if (season === 'winter') {
    pushTip(tips, seen, 'season-winter', 66,
      'Victorian winter: daylight ends by ~5 pm — set a turn-around by 3 pm, pack thermal mid-layer and beanie/gloves.',
    );
  } else if (season === 'autumn') {
    pushTip(tips, seen, 'season-autumn', 60,
      'Autumn conditions: wet leaves are slippery on stone steps; add an insulating layer for after-sunset temps.',
    );
  } else if (season === 'spring') {
    pushTip(tips, seen, 'season-spring', 60,
      'Spring conditions: snow can linger above 1000 m, streams may run high from melt — allow extra buffer time.',
    );
  }

  if (region && !isVictorianRegion(region)) {
    pushTip(tips, seen, 'region-visitor', 58,
      `Visiting Victoria from ${region}: monitor VicEmergency, know that mobile coverage drops outside main trails, and snakes are most active Oct–Apr.`,
    );
  }

  if (userLevel === 'newcomer') {
    pushTip(tips, seen, 'level-newcomer', 56,
      'Newcomer safety: hike with a partner and share your start/ETA with a trusted contact before you lose signal.',
    );
  } else if (userLevel === 'intermediate') {
    pushTip(tips, seen, 'level-intermediate', 54,
      'Intermediate safety: keep one named fallback route and re-check alerts at the midpoint.',
    );
  } else {
    pushTip(tips, seen, 'level-advanced', 52,
      'Advanced safety: set objective turn-around thresholds (time / weather / fatigue) before committing to exposed sections.',
    );
  }

  tips.sort((a, b) => b.priority - a.priority);
  return tips.slice(0, maxTips).map((tip) => tip.text);
}

// ── Layer 1: Base Risk ──────────────────────────────────────────

interface HazardExposureResult {
  score: number;
  impacts: HazardImpact[];
  diversityBoost: number;
}

function computeHazardExposure(
  hazards: Hazard[],
  geometry: RouteGeometry,
  now: Date,
): HazardExposureResult {
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

  if (!top6.length) {
    return { score: 0, impacts: [], diversityBoost: 1 };
  }

  const uniqueTypes = new Set(top6.map((item) => item.hazard.type)).size;
  const diversityBoost = 1 + (uniqueTypes / 6) * 0.35;

  const avg = top6.reduce((sum, item) => sum + item.impact, 0) / top6.length;
  return {
    score: Number(clamp(avg * Math.min(1.65, diversityBoost)).toFixed(1)),
    impacts: top6,
    diversityBoost: Number(diversityBoost.toFixed(2)),
  };
}

interface RouteEffortResult {
  score: number;
  burdenScore: number;
  elevationFatigue: number;
}

function computeRouteEffort(
  route: { distanceKm?: number; durationMin?: number },
  geographyProfile: GeographyProfile | null,
): RouteEffortResult {
  const burdenScore = routeBurdenScore(route);
  const ascentScore = clamp((Number(geographyProfile?.totalAscentM || 0) / 1400) * 100);
  const slopeScore = clamp((Number(geographyProfile?.maxSlopePct || 0) / 35) * 100);
  const elevationFatigue = clamp(0.6 * ascentScore + 0.4 * slopeScore);

  return {
    score: Number(clamp(0.55 * burdenScore + 0.45 * elevationFatigue).toFixed(1)),
    burdenScore: Number(burdenScore.toFixed(1)),
    elevationFatigue: Number(elevationFatigue.toFixed(1)),
  };
}

interface TerrainDangerResult {
  score: number;
  zoneCoverage: number;
  terrainSurface: number;
  exposureCounts: number;
  coverageImpacts: CoverageImpact[];
}

function computeTerrainDanger(
  geometry: RouteGeometry,
  hazards: Hazard[],
  geographyProfile: GeographyProfile | null,
  now: Date,
): TerrainDangerResult {
  const coverageImpacts = collectCoverageImpacts(hazards, geometry, () => true, now);
  const zoneCoverage = coverageZoneScore(coverageImpacts);

  const terrainSurface = terrainPenalty(
    geographyProfile?.surfaceType,
    geographyProfile?.trailCondition,
  );

  const exposureCounts = clamp(
    (Number(geographyProfile?.riverCrossingCount || 0) * 10) +
      (Number(geographyProfile?.cliffExposureCount || 0) * 14) +
      (Number(geographyProfile?.closureCount || 0) * 28),
    0,
    100,
  );

  return {
    score: Number(clamp(0.4 * zoneCoverage + 0.3 * terrainSurface + 0.3 * exposureCounts).toFixed(1)),
    zoneCoverage: Number(zoneCoverage.toFixed(1)),
    terrainSurface: Number(terrainSurface.toFixed(1)),
    exposureCounts: Number(exposureCounts.toFixed(1)),
    coverageImpacts,
  };
}

// ── Layer 2: Environmental Multiplier ───────────────────────────

interface EnvMultiplierResult {
  multiplier: number;
  sunAdjust: number;
  seasonAdjust: number;
  tempAdjust: number;
  sunsetHour: number;
  finishHour: number;
}

function computeEnvMultiplier({
  lat,
  lng,
  now,
  durationMin,
  season,
  maxFeelsLike,
}: {
  lat: number;
  lng: number;
  now: Date;
  durationMin: number;
  season: Season;
  maxFeelsLike: number | null;
}): EnvMultiplierResult {
  const sunsetHour = computeDayMinutes(lat, lng, now);
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowHour = nowDate.getHours() + nowDate.getMinutes() / 60;
  const finishHour = nowHour + (durationMin || 0) / 60;
  const daylightGap = finishHour - sunsetHour;

  let sunAdjust = 0;
  if (daylightGap < -2) sunAdjust = -0.1;
  else if (daylightGap < 0) sunAdjust = 0;
  else if (daylightGap < 0.5) sunAdjust = 0.08;
  else if (daylightGap < 1) sunAdjust = 0.15;
  else sunAdjust = 0.22;

  const seasonMap: Record<string, number> = { summer: 0.1, autumn: -0.05, winter: 0.06, spring: 0.0 };
  const seasonAdjust = seasonMap[season] || 0;

  let tempAdjust = 0;
  const t = Number(maxFeelsLike);
  if (Number.isFinite(t)) {
    if (t < 5) tempAdjust = 0.06;
    else if (t < 30) tempAdjust = 0;
    else if (t < 35) tempAdjust = 0.04;
    else if (t < 38) tempAdjust = 0.08;
    else if (t < 42) tempAdjust = 0.14;
    else tempAdjust = 0.2;
  }

  const multiplier = clamp(1.0 + sunAdjust + seasonAdjust + tempAdjust, 0.7, 1.4);

  return {
    multiplier: Number(multiplier.toFixed(2)),
    sunAdjust: Number(sunAdjust.toFixed(2)),
    seasonAdjust: Number(seasonAdjust.toFixed(2)),
    tempAdjust: Number(tempAdjust.toFixed(2)),
    sunsetHour: Number(sunsetHour.toFixed(1)),
    finishHour: Number(finishHour.toFixed(1)),
  };
}

// ── Layer 3: Interaction Penalty ────────────────────────────────

function computeInteractionPenalty({
  hazardTypes,
  hazardImpacts,
  geographyProfile,
  durationMin,
  sunsetHour,
  finishHour,
  maxFeelsLike,
  candidateCount,
}: {
  hazardTypes: HazardType[];
  hazardImpacts: HazardImpact[];
  geographyProfile: GeographyProfile | null;
  durationMin: number;
  sunsetHour: number;
  finishHour: number;
  maxFeelsLike: number | null;
  candidateCount: number;
}): number {
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
  if (hasFire && hazardImpacts.some((item) => item.hazard.type === 'fire' && item.distanceKm <= 1))
    penalty += 8;
  if (types.size >= 2) {
    const nearHazards = hazardImpacts.filter((item) => item.distanceKm <= 1);
    const nearTypes = new Set(nearHazards.map((item) => item.hazard.type));
    if (nearTypes.size >= 2) penalty += 6;
  }
  if (finishAfterSunset && (cliffCount > 0 || riverCount > 0)) penalty += 8;
  if (Number.isFinite(maxFeelsLike) && (maxFeelsLike as number) < 2 && (hasFlood || hasStorm)) penalty += 6;

  return clamp(penalty, 0, 30);
}

// ── Main Scoring ────────────────────────────────────────────────

export interface ScoreRouteCandidateParams {
  route: RouteCandidate;
  hazards: Hazard[];
  userLevel: UserLevel;
  userProfile?: User | null;
  fastestRoute: RouteCandidate;
  geographyProfile?: GeographyProfile | null;
  now?: Date;
  maxFeelsLike?: number | null;
  candidateCount?: number;
}

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
}: ScoreRouteCandidateParams): RouteCandidate {
  const geometry = route.geometry || [];
  const midpoint = geometry.length
    ? geometry[Math.floor(geometry.length / 2)]
    : [-37.81, 144.96];

  // Layer 1: Base Risk
  const hazardExposure = computeHazardExposure(hazards, geometry, now);
  const routeEffort = computeRouteEffort(route, geographyProfile);
  const terrainDanger = computeTerrainDanger(geometry, hazards, geographyProfile, now);

  const baseRisk = clamp(
    0.4 * hazardExposure.score + 0.3 * routeEffort.score + 0.3 * terrainDanger.score,
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
    hazardTypes: [...new Set(hazardExposure.impacts.map((item) => item.hazard.type))] as HazardType[],
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

  // Go/No-Go
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

  // Key risks
  const coverageImpacts = terrainDanger.coverageImpacts;
  const keyRisks: KeyRisk[] = coverageImpacts.slice(0, 3).map((item) => ({
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

  const zoneSummary: ZoneSummary = {
    level1Count: coverageImpacts.filter((item) => item.zoneLevel === 1).length,
    level2Count: coverageImpacts.filter((item) => item.zoneLevel === 2).length,
    level3Count: coverageImpacts.filter((item) => item.zoneLevel === 3).length,
  };

  const scoringBreakdown: ScoringBreakdown = {
    baseRisk: Number(baseRisk.toFixed(1)),
    hazardExposure: hazardExposure.score,
    diversityBoost: hazardExposure.diversityBoost,
    routeEffort: routeEffort.score,
    burdenScore: routeEffort.burdenScore,
    elevationFatigue: routeEffort.elevationFatigue,
    terrainDanger: terrainDanger.score,
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
  };

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
    geographyProfile: geographyProfile ?? undefined,
    zoneSummary,
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
    scoringBreakdown,
  };
}

export function buildDetourWaypointCandidates(start: Coordinate, end: Coordinate): Coordinate[] {
  const mid = [(start.lat + end.lat) / 2, (start.lng + end.lng) / 2] as [number, number];
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
  const candidates: Coordinate[] = [];

  offsetMagnitudesKm.forEach((offsetKm) => {
    const latDeg = offsetKm / 111.32;
    const lngDeg = offsetKm / (111.32 * cosLatFallback);
    candidates.push({
      lat: mid[0] + perpLat * latDeg,
      lng: mid[1] + perpLng * lngDeg,
    });
    candidates.push({
      lat: mid[0] - perpLat * latDeg,
      lng: mid[1] - perpLng * lngDeg,
    });
  });

  return candidates;
}

export const __testing_risk__ = {
  computeDayMinutes,
  computeEnvMultiplier,
  computeInteractionPenalty,
  computeHazardExposure,
  computeRouteEffort,
  computeTerrainDanger,
};
