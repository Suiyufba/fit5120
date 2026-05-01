/**
 * Hiking duration estimation.
 *
 * Combines three established walking-time models:
 *   1. Tobler's hiking function (speed as a function of slope):
 *        v(S) = 6 * exp(-3.5 * |S + 0.05|)   km/h, S = dh/dx (slope fraction)
 *   2. Naismith's rule for ascent cost  (+1 min per 10 m climbed).
 *   3. Langmuir's correction for steep descents (>12% grade slows hikers).
 *
 * It layers on top:
 *   - Terrain surface and trail condition multipliers (OSM tag driven).
 *   - User experience calibration (newcomer / intermediate / advanced).
 *   - Ascent-scaled break time (more climbing = more rests).
 *
 * The module is pure (no I/O) so it is cheap to unit-test and reuse.
 */

const MIN_SAFE_SPEED_KMH = 1.4;
const MAX_SAFE_SPEED_KMH = 6.0;
const MIN_FACTOR = 0.75;
const MAX_FACTOR = 1.6;
const FALLBACK_SPEED_KMH = 4.5;

const SURFACE_FACTOR = {
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

const TRAIL_CONDITION_FACTOR = {
  excellent: 0.97,
  good: 1.0,
  intermediate: 1.06,
  poor: 1.14,
  bad: 1.16,
  very_bad: 1.26,
  horrible: 1.4,
};

const USER_PACE_FACTOR = {
  advanced: 0.9,
  intermediate: 1.0,
  newcomer: 1.15,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toblerSpeedKmh(slopeGrade) {
  return 6 * Math.exp(-3.5 * Math.abs(slopeGrade + 0.05));
}

export function terrainSpeedFactor(surfaceType, trailCondition) {
  const surfaceKey = String(surfaceType || '').toLowerCase();
  const conditionKey = String(trailCondition || '').toLowerCase();
  const surface = SURFACE_FACTOR[surfaceKey] ?? 1.0;
  const condition = TRAIL_CONDITION_FACTOR[conditionKey] ?? 1.0;
  return clamp(surface * condition, MIN_FACTOR, MAX_FACTOR);
}

export function userPaceFactor(userLevel) {
  return USER_PACE_FACTOR[String(userLevel || '').toLowerCase()] ?? USER_PACE_FACTOR.newcomer;
}

function naismithAscentMinutes(ascentM) {
  // Classic Naismith: +1 min per 10 m of ascent. Steep climbs (>600m) get an
  // additional fatigue tax because Tobler alone under-predicts sustained effort.
  const climb = Math.max(Number(ascentM) || 0, 0);
  const base = climb / 10;
  const fatigue = climb > 600 ? (climb - 600) / 45 : 0;
  return base + fatigue;
}

function langmuirDescentMinutes(descentM, avgSlopePct) {
  const descent = Math.max(Number(descentM) || 0, 0);
  const slope = Math.max(Number(avgSlopePct) || 0, 0);
  // Gentle downhills actually speed you up — Langmuir subtracts time on <12% grade.
  // Steep ones cost time because you have to control the descent.
  if (descent <= 0) return 0;
  if (slope <= 12) return -(descent / 200);
  return (descent - 300) > 0 ? (descent - 300) / 40 : 0;
}

function breakMinutes(movingMinutes, ascentM) {
  const hours = Math.max(movingMinutes, 0) / 60;
  const restPerHour = 8;
  const climbFactor = Math.min(Math.max(Number(ascentM) || 0, 0) / 400, 3) * 10;
  return hours * restPerHour + climbFactor;
}

function deriveAvgSlopeFromProfile(geographyProfile, distanceKm) {
  const reported = Number(geographyProfile?.avgSlopePct || 0);
  if (reported > 0) return reported;
  const ascent = Math.max(Number(geographyProfile?.totalAscentM || 0), 0);
  const descent = Math.max(Number(geographyProfile?.totalDescentM || 0), 0);
  if ((ascent + descent) <= 0 || distanceKm <= 0) return 0;
  // Estimate from raw ascent+descent averaged over the distance (meters over meters *100 %).
  return clamp(((ascent + descent) / (distanceKm * 1000)) * 100, 0, 30);
}

/**
 * Estimate realistic hiking duration (minutes) for a route.
 *
 * @param {object} opts
 * @param {number} opts.distanceKm Route length in kilometres.
 * @param {object} [opts.geographyProfile] Optional elevation/terrain profile.
 * @param {string} [opts.userLevel='newcomer'] User experience label.
 * @param {number} [opts.fallbackSpeedKmh=4.5] Used when no geography is known.
 * @param {number} [opts.floorMin=0] Optional minimum duration from the route provider.
 * @returns {number} Estimated duration in minutes, rounded to 1 decimal.
 */
export function estimateHikingDurationMin({
  distanceKm,
  geographyProfile = null,
  userLevel = 'newcomer',
  fallbackSpeedKmh = FALLBACK_SPEED_KMH,
  floorMin = 0,
} = {}) {
  const distance = Math.max(Number(distanceKm) || 0, 0);
  if (distance === 0) {
    return Number(Math.max(floorMin, 0).toFixed(1));
  }

  const ascentM = Math.max(Number(geographyProfile?.totalAscentM || 0), 0);
  const descentM = Math.max(Number(geographyProfile?.totalDescentM || 0), 0);
  const avgSlopePct = deriveAvgSlopeFromProfile(geographyProfile, distance);
  const hasProfile = ascentM > 0 || descentM > 0 || avgSlopePct > 0;

  let movingMinutes;
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
