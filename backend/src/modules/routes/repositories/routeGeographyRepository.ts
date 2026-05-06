// @ts-nocheck
import { getPgPool } from '../../../infrastructure/db/postgresClient.js';

const ROUTE_GEOGRAPHY_PROFILE_VERSION = 4;

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS route_geography_profiles (
  route_hash TEXT PRIMARY KEY,
  profile_version INTEGER NOT NULL DEFAULT 3,
  distance_km DOUBLE PRECISION NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  elevation_min_m DOUBLE PRECISION NOT NULL DEFAULT 0,
  elevation_max_m DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_ascent_m DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_descent_m DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_slope_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_slope_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  terrain_type TEXT NOT NULL DEFAULT 'mixed',
  surface_type TEXT NOT NULL DEFAULT 'unknown',
  trail_condition TEXT NOT NULL DEFAULT 'unknown',
  river_crossing_count INTEGER NOT NULL DEFAULT 0,
  cliff_exposure_count INTEGER NOT NULL DEFAULT 0,
  closure_count INTEGER NOT NULL DEFAULT 0,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

function mapRow(row) {
  if (!row) return null;
  return {
    routeHash: row.route_hash,
    profileVersion: Number(row.profile_version || ROUTE_GEOGRAPHY_PROFILE_VERSION),
    distanceKm: Number(row.distance_km || 0),
    sampleCount: Number(row.sample_count || 0),
    elevationMinM: Number(row.elevation_min_m || 0),
    elevationMaxM: Number(row.elevation_max_m || 0),
    totalAscentM: Number(row.total_ascent_m || 0),
    totalDescentM: Number(row.total_descent_m || 0),
    maxSlopePct: Number(row.max_slope_pct || 0),
    avgSlopePct: Number(row.avg_slope_pct || 0),
    terrainType: row.terrain_type || 'mixed',
    surfaceType: row.surface_type || 'unknown',
    trailCondition: row.trail_condition || 'unknown',
    riverCrossingCount: Number(row.river_crossing_count || 0),
    cliffExposureCount: Number(row.cliff_exposure_count || 0),
    closureCount: Number(row.closure_count || 0),
    raw: row.raw_json || {},
  };
}

export async function initRouteGeographyStore() {
  const pool = getPgPool();
  if (!pool) return false;
  await pool.query(CREATE_TABLE_SQL);
  await pool.query(`ALTER TABLE route_geography_profiles ADD COLUMN IF NOT EXISTS profile_version INTEGER NOT NULL DEFAULT ${ROUTE_GEOGRAPHY_PROFILE_VERSION}`);
  return true;
}

export async function getRouteGeographyProfile(routeHash) {
  const pool = getPgPool();
  if (!pool || !routeHash) return null;

  const result = await pool.query(
    `
    SELECT route_hash, profile_version, distance_km, sample_count, elevation_min_m, elevation_max_m,
           total_ascent_m, total_descent_m, max_slope_pct, avg_slope_pct,
           terrain_type, surface_type, trail_condition,
           river_crossing_count, cliff_exposure_count, closure_count, raw_json
    FROM route_geography_profiles
    WHERE route_hash = $1 AND profile_version = $2
    LIMIT 1
    `,
    [routeHash, ROUTE_GEOGRAPHY_PROFILE_VERSION]
  );

  return mapRow(result.rows[0]);
}

export async function upsertRouteGeographyProfile(routeHash, payload = {}) {
  const pool = getPgPool();
  if (!pool || !routeHash) return null;

  const result = await pool.query(
    `
    INSERT INTO route_geography_profiles (
      route_hash, profile_version, distance_km, sample_count, elevation_min_m, elevation_max_m,
      total_ascent_m, total_descent_m, max_slope_pct, avg_slope_pct,
      terrain_type, surface_type, trail_condition,
      river_crossing_count, cliff_exposure_count, closure_count, raw_json, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
    )
    ON CONFLICT (route_hash) DO UPDATE SET
      profile_version = EXCLUDED.profile_version,
      distance_km = EXCLUDED.distance_km,
      sample_count = EXCLUDED.sample_count,
      elevation_min_m = EXCLUDED.elevation_min_m,
      elevation_max_m = EXCLUDED.elevation_max_m,
      total_ascent_m = EXCLUDED.total_ascent_m,
      total_descent_m = EXCLUDED.total_descent_m,
      max_slope_pct = EXCLUDED.max_slope_pct,
      avg_slope_pct = EXCLUDED.avg_slope_pct,
      terrain_type = EXCLUDED.terrain_type,
      surface_type = EXCLUDED.surface_type,
      trail_condition = EXCLUDED.trail_condition,
      river_crossing_count = EXCLUDED.river_crossing_count,
      cliff_exposure_count = EXCLUDED.cliff_exposure_count,
      closure_count = EXCLUDED.closure_count,
      raw_json = EXCLUDED.raw_json,
      updated_at = NOW()
    RETURNING route_hash, profile_version, distance_km, sample_count, elevation_min_m, elevation_max_m,
              total_ascent_m, total_descent_m, max_slope_pct, avg_slope_pct,
              terrain_type, surface_type, trail_condition,
              river_crossing_count, cliff_exposure_count, closure_count, raw_json
    `,
    [
      routeHash,
      ROUTE_GEOGRAPHY_PROFILE_VERSION,
      Number(payload.distanceKm || 0),
      Number(payload.sampleCount || 0),
      Number(payload.elevationMinM || 0),
      Number(payload.elevationMaxM || 0),
      Number(payload.totalAscentM || 0),
      Number(payload.totalDescentM || 0),
      Number(payload.maxSlopePct || 0),
      Number(payload.avgSlopePct || 0),
      payload.terrainType || 'mixed',
      payload.surfaceType || 'unknown',
      payload.trailCondition || 'unknown',
      Number(payload.riverCrossingCount || 0),
      Number(payload.cliffExposureCount || 0),
      Number(payload.closureCount || 0),
      JSON.stringify(payload.raw || {}),
    ]
  );

  return mapRow(result.rows[0]);
}

export { ROUTE_GEOGRAPHY_PROFILE_VERSION };
