import type { GeographyProfile, UserLevel } from 'hikeshield-shared';

const MIN_SAFE_SPEED_KMH = 1.4;
const MAX_SAFE_SPEED_KMH = 6.0;
const MIN_FACTOR = 0.75;
const MAX_FACTOR = 1.6;
const FALLBACK_SPEED_KMH = 4.5;

const SURFACE_FACTOR: Record<string, number> = {
  paved: 0.95,
  asphalt: 0.95,
  concrete: 0.95,
  compacted: 0.98,
  fine_gravel: 1.02,
  gravel: 1.05,
  dirt: 1.05,
  ground: 1.05,
  grass: 1.08,
  pebblestone: 1.12,
  rock: 1.18,
  sand: 1.22,
  mud: 1.26,
};

const TRAIL_CONDITION_FACTOR: Record<string, number> = {
  excellent: 0.97,
  good: 1.0,
  intermediate: 1.06,
  poor: 1.14,
  bad: 1.16,
  very_bad: 1.26,
  horrible: 1.4,
};

const USER_PACE_FACTOR: Record<string, number> = {
  advanced: 0.9,
  intermediate: 1.0,
  newcomer: 1.15,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toblerSpeedKmh(slopeGrade: number): number {
  return 6 * Math.exp(-3.5 * Math.abs(slopeGrade + 0.05));
}

export function terrainSpeedFactor(surfaceType?: string, trailCondition?: string): number {
  const surfaceKey = String(surfaceType || '').toLowerCase();
  const conditionKey = String(trailCondition || '').toLowerCase();
  const surface = SURFACE_FACTOR[surfaceKey] ?? 1.0;
  const condition = TRAIL_CONDITION_FACTOR[conditionKey] ?? 1.0;
  return clamp(surface * condition, MIN_FACTOR, MAX_FACTOR);
}

export function userPaceFactor(userLevel?: UserLevel): number {
  return USER_PACE_FACTOR[String(userLevel || '').toLowerCase()] ?? USER_PACE_FACTOR.newcomer;
}

function naismithAscentMinutes(ascentM: number): number {
  const climb = Math.max(Number(ascentM) || 0, 0);
  const base = climb / 10;
  const fatigue = climb > 600 ? (climb - 600) / 45 : 0;
  return base + fatigue;
}

function langmuirDescentMinutes(descentM: number, avgSlopePct: number): number {
  const descent = Math.max(Number(descentM) || 0, 0);
  const slope = Math.max(Number(avgSlopePct) || 0, 0);
  if (descent <= 0) return 0;
  if (slope <= 12) return -(descent / 200);
  return (descent - 300) > 0 ? (descent - 300) / 40 : 0;
}

function breakMinutes(movingMinutes: number, ascentM: number): number {
  const hours = Math.max(movingMinutes, 0) / 60;
  const restPerHour = 8;
  const climbFactor = Math.min(Math.max(Number(ascentM) || 0, 0) / 400, 3) * 10;
  return hours * restPerHour + climbFactor;
}

function deriveAvgSlopeFromProfile(geographyProfile: GeographyProfile | null, distanceKm: number): number {
  const reported = Number(geographyProfile?.avgSlopePct || 0);
  if (reported > 0) return reported;
  const ascent = Math.max(Number(geographyProfile?.totalAscentM || 0), 0);
  const descent = Math.max(Number(geographyProfile?.totalDescentM || 0), 0);
  if ((ascent + descent) <= 0 || distanceKm <= 0) return 0;
  return clamp(((ascent + descent) / (distanceKm * 1000)) * 100, 0, 30);
}

export interface EstimateOptions {
  distanceKm: number;
  geographyProfile?: GeographyProfile | null;
  userLevel?: UserLevel;
  fallbackSpeedKmh?: number;
  floorMin?: number;
}

export function estimateHikingDurationMin({
  distanceKm,
  geographyProfile = null,
  userLevel = 'newcomer',
  fallbackSpeedKmh = FALLBACK_SPEED_KMH,
  floorMin = 0,
}: EstimateOptions): number {
  const distance = Math.max(Number(distanceKm) || 0, 0);
  if (distance === 0) {
    return Number(Math.max(floorMin, 0).toFixed(1));
  }

  const ascentM = Math.max(Number(geographyProfile?.totalAscentM || 0), 0);
  const descentM = Math.max(Number(geographyProfile?.totalDescentM || 0), 0);
  const avgSlopePct = deriveAvgSlopeFromProfile(geographyProfile, distance);
  const hasProfile = ascentM > 0 || descentM > 0 || avgSlopePct > 0;

  let movingMinutes: number;
  if (hasProfile) {
    const toblerSpeed = clamp(toblerSpeedKmh(avgSlopePct / 100), MIN_SAFE_SPEED_KMH, MAX_SAFE_SPEED_KMH);
    const horizontalMin = (distance / toblerSpeed) * 60;
    const ascentMin = naismithAscentMinutes(ascentM);
    const descentMin = langmuirDescentMinutes(descentM, avgSlopePct);
    movingMinutes = horizontalMin + ascentMin + descentMin;
  } else {
    const baseSpeed = Math.max(Number(fallbackSpeedKmh) || FALLBACK_SPEED_KMH, 2.5);
    movingMinutes = (distance / baseSpeed) * 60;
  }

  const terrainFactor = terrainSpeedFactor(
    geographyProfile?.surfaceType,
    geographyProfile?.trailCondition,
  );
  const userFactor = userPaceFactor(userLevel);
  movingMinutes = Math.max(movingMinutes * terrainFactor * userFactor, 0);

  const rest = breakMinutes(movingMinutes, ascentM);
  const total = movingMinutes + rest;

  const withFloor = Math.max(total, Math.max(floorMin, 0));
  return Number(withFloor.toFixed(1));
}

export const __testing__ = {
  toblerSpeedKmh,
  naismithAscentMinutes,
  langmuirDescentMinutes,
  breakMinutes,
};
