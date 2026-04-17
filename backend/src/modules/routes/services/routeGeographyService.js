import { createHash } from 'node:crypto';
import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { distanceToRouteKm } from '../domain/routeRisk.js';
import {
  getRouteGeographyProfile,
  upsertRouteGeographyProfile,
} from '../repositories/routeGeographyRepository.js';

function clamp(value, min, max) {
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

function hashGeometry(geometry = []) {
  return createHash('sha1').update(JSON.stringify(geometry)).digest('hex');
}

function sampleGeometry(geometry = [], maxPoints = 80) {
  if (!Array.isArray(geometry) || geometry.length <= maxPoints) return geometry;
  const stride = Math.max(1, Math.ceil(geometry.length / maxPoints));
  const sampled = geometry.filter((_, index) => index % stride === 0);
  const last = geometry[geometry.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function bboxFromGeometry(geometry = []) {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;

  geometry.forEach(([lat, lng]) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  });

  const pad = 0.01;
  return {
    south: south - pad,
    west: west - pad,
    north: north + pad,
    east: east + pad,
  };
}

function mode(values, fallback = 'unknown') {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  let best = fallback;
  let bestCount = -1;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

function isTrailWay(tags = {}) {
  return ['path', 'track', 'footway', 'bridleway', 'steps'].includes(String(tags.highway || '').toLowerCase());
}

function isMeaningfulGeographyProfile(profile = {}) {
  const hasElevationSignal = [
    Number(profile.totalAscentM || 0),
    Number(profile.totalDescentM || 0),
    Number(profile.maxSlopePct || 0),
    Number(profile.avgSlopePct || 0),
  ].some((value) => value > 0);
  if (hasElevationSignal) return true;

  const terrainType = String(profile.terrainType || '').toLowerCase();
  const surfaceType = String(profile.surfaceType || '').toLowerCase();
  const trailCondition = String(profile.trailCondition || '').toLowerCase();
  const hasTerrainSignal = (
    (terrainType && terrainType !== 'mixed')
    || (surfaceType && surfaceType !== 'unknown')
    || (trailCondition && trailCondition !== 'unknown')
  );
  if (hasTerrainSignal) return true;

  return [
    Number(profile.riverCrossingCount || 0),
    Number(profile.cliffExposureCount || 0),
    Number(profile.closureCount || 0),
  ].some((value) => value > 0);
}

function buildElevationProfileFromPoints(points = []) {
  const cleanPoints = points.filter((item) =>
    Number.isFinite(item.lat) && Number.isFinite(item.lng) && Number.isFinite(item.elevation)
  );

  if (!cleanPoints.length) {
    return {
      elevationMinM: 0,
      elevationMaxM: 0,
      totalAscentM: 0,
      totalDescentM: 0,
      maxSlopePct: 0,
      avgSlopePct: 0,
      points: [],
    };
  }

  let totalAscentM = 0;
  let totalDescentM = 0;
  let maxSlopePct = 0;
  let slopeSum = 0;
  let slopeCount = 0;

  for (let index = 1; index < cleanPoints.length; index += 1) {
    const prev = cleanPoints[index - 1];
    const next = cleanPoints[index];
    const delta = next.elevation - prev.elevation;
    if (delta > 0) totalAscentM += delta;
    if (delta < 0) totalDescentM += Math.abs(delta);

    const runMeters = haversineKm([prev.lat, prev.lng], [next.lat, next.lng]) * 1000;
    if (runMeters > 1) {
      const slopePct = Math.abs((delta / runMeters) * 100);
      maxSlopePct = Math.max(maxSlopePct, slopePct);
      slopeSum += slopePct;
      slopeCount += 1;
    }
  }

  return {
    elevationMinM: Math.min(...cleanPoints.map((point) => point.elevation)),
    elevationMaxM: Math.max(...cleanPoints.map((point) => point.elevation)),
    totalAscentM: Number(totalAscentM.toFixed(1)),
    totalDescentM: Number(totalDescentM.toFixed(1)),
    maxSlopePct: Number(maxSlopePct.toFixed(1)),
    avgSlopePct: Number((slopeCount ? slopeSum / slopeCount : 0).toFixed(1)),
    points: cleanPoints,
  };
}

async function fetchElevationPointsFromOpenTopoData(sampledGeometry) {
  const chunks = [];
  for (let index = 0; index < sampledGeometry.length; index += 40) {
    chunks.push(sampledGeometry.slice(index, index + 40));
  }

  const points = [];
  for (const chunk of chunks) {
    const url = new URL(`/v1/${config.openTopoDataDataset}`, config.openTopoDataApiUrl);
    url.searchParams.set(
      'locations',
      chunk.map(([lat, lng]) => `${lat},${lng}`).join('|')
    );

    const payload = await fetchJson(url.toString(), {
      timeoutMs: Math.max(config.requestTimeoutMs, 15000),
    });
    const results = Array.isArray(payload?.results) ? payload.results : [];
    results.forEach((item, index) => {
      points.push({
        lat: chunk[index]?.[0],
        lng: chunk[index]?.[1],
        elevation: Number(item?.elevation),
      });
    });
  }

  return points;
}

async function fetchElevationPointsFromOpenMeteo(sampledGeometry) {
  const chunks = [];
  for (let index = 0; index < sampledGeometry.length; index += 80) {
    chunks.push(sampledGeometry.slice(index, index + 80));
  }

  const points = [];
  for (const chunk of chunks) {
    const url = new URL(config.openMeteoElevationApiUrl);
    url.searchParams.set('latitude', chunk.map(([lat]) => String(lat)).join(','));
    url.searchParams.set('longitude', chunk.map(([, lng]) => String(lng)).join(','));

    const payload = await fetchJson(url.toString(), {
      timeoutMs: Math.max(config.requestTimeoutMs, 15000),
    });
    const elevations = Array.isArray(payload?.elevation) ? payload.elevation : [];
    elevations.forEach((elevation, index) => {
      points.push({
        lat: chunk[index]?.[0],
        lng: chunk[index]?.[1],
        elevation: Number(elevation),
      });
    });
  }

  return points;
}

async function fetchElevationProfile(sampledGeometry, routeHash = '') {
  try {
    const points = await fetchElevationPointsFromOpenTopoData(sampledGeometry);
    const profile = buildElevationProfileFromPoints(points);
    if (profile.points.length) return profile;
    console.warn('[routeGeography] elevation profile empty from OpenTopoData', { routeHash });
  } catch (error) {
    console.warn('[routeGeography] elevation profile fetch failed (OpenTopoData)', {
      routeHash,
      message: String(error?.message || error || 'unknown error'),
    });
  }

  try {
    const points = await fetchElevationPointsFromOpenMeteo(sampledGeometry);
    const profile = buildElevationProfileFromPoints(points);
    if (profile.points.length) {
      console.warn('[routeGeography] using fallback elevation provider (Open-Meteo)', {
        routeHash,
        points: profile.points.length,
      });
      return profile;
    }
    console.warn('[routeGeography] elevation profile empty from Open-Meteo fallback', { routeHash });
  } catch (error) {
    console.warn('[routeGeography] elevation profile fetch failed (Open-Meteo fallback)', {
      routeHash,
      message: String(error?.message || error || 'unknown error'),
    });
  }

  return buildElevationProfileFromPoints([]);
}

function pointForElement(element) {
  if (Number.isFinite(element?.lat) && Number.isFinite(element?.lon)) {
    return [element.lat, element.lon];
  }
  if (Number.isFinite(element?.center?.lat) && Number.isFinite(element?.center?.lon)) {
    return [element.center.lat, element.center.lon];
  }
  const geometry = Array.isArray(element?.geometry) ? element.geometry : [];
  if (geometry.length) {
    const mid = geometry[Math.floor(geometry.length / 2)];
    if (Number.isFinite(mid?.lat) && Number.isFinite(mid?.lon)) {
      return [mid.lat, mid.lon];
    }
  }
  return null;
}

async function fetchTerrainConstraints(geometry) {
  const bbox = bboxFromGeometry(geometry);
  const query = `
[out:json][timeout:25];
(
  way["highway"~"path|track|footway|bridleway|steps"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["surface"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["smoothness"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["trail_visibility"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["access"="no"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["foot"="no"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["natural"="cliff"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["natural"="cliff"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["waterway"~"river|stream|canal|drain"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["ford"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["ford"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center geom tags;
`;

  const payload = await fetchJson(config.overpassApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: `data=${encodeURIComponent(query)}`,
    timeoutMs: Math.max(config.requestTimeoutMs, 25000),
  });

  const elements = Array.isArray(payload?.elements) ? payload.elements : [];
  const closeTrailWays = [];
  let riverCrossingCount = 0;
  let cliffExposureCount = 0;
  let closureCount = 0;

  elements.forEach((element) => {
    const point = pointForElement(element);
    if (!point) return;
    const distanceKm = distanceToRouteKm(point, geometry);
    if (!Number.isFinite(distanceKm) || distanceKm > 0.25) return;

    const tags = element.tags || {};
    const trailWay = isTrailWay(tags);
    if (trailWay && distanceKm <= 0.08) {
      closeTrailWays.push(tags);
    }
    if (tags.natural === 'cliff' && distanceKm <= 0.08) cliffExposureCount += 1;
    if ((tags.ford || tags.waterway) && distanceKm <= 0.05) riverCrossingCount += 1;
    if (trailWay && (tags.access === 'no' || tags.foot === 'no') && distanceKm <= 0.03) closureCount += 1;
  });

  const terrainType = mode(closeTrailWays.map((tags) => tags.highway || ''), 'mixed');
  const surfaceType = mode(closeTrailWays.map((tags) => tags.surface || ''), 'unknown');
  const trailCondition = mode(
    closeTrailWays.map((tags) => tags.smoothness || tags.trail_visibility || ''),
    'unknown'
  );

  return {
    terrainType,
    surfaceType,
    trailCondition,
    riverCrossingCount,
    cliffExposureCount,
    closureCount,
    raw: {
      closeTrailSampleCount: closeTrailWays.length,
    },
  };
}

export async function getRouteGeographyProfileForRoute(route) {
  const geometry = Array.isArray(route?.geometry) ? route.geometry : [];
  if (geometry.length < 2) {
    return {
      routeHash: '',
      distanceKm: Number(route?.distanceKm || 0),
      sampleCount: 0,
      elevationMinM: 0,
      elevationMaxM: 0,
      totalAscentM: 0,
      totalDescentM: 0,
      maxSlopePct: 0,
      avgSlopePct: 0,
      terrainType: 'mixed',
      surfaceType: 'unknown',
      trailCondition: 'unknown',
      riverCrossingCount: 0,
      cliffExposureCount: 0,
      closureCount: 0,
      raw: {},
    };
  }

  const routeHash = hashGeometry(geometry);
  const cached = await getRouteGeographyProfile(routeHash);
  if (cached && isMeaningfulGeographyProfile(cached)) return cached;

  const sampledGeometry = sampleGeometry(geometry, 80);
  const [elevation, constraints] = await Promise.all([
    fetchElevationProfile(sampledGeometry, routeHash).catch(() => null),
    fetchTerrainConstraints(geometry).catch((error) => {
      console.warn('[routeGeography] terrain constraints fetch failed', {
        routeHash,
        message: String(error?.message || error || 'unknown error'),
      });
      return null;
    }),
  ]);

  const profile = {
    routeHash,
    distanceKm: Number(route?.distanceKm || 0),
    sampleCount: sampledGeometry.length,
    elevationMinM: Number(elevation?.elevationMinM || 0),
    elevationMaxM: Number(elevation?.elevationMaxM || 0),
    totalAscentM: Number(elevation?.totalAscentM || 0),
    totalDescentM: Number(elevation?.totalDescentM || 0),
    maxSlopePct: Number(elevation?.maxSlopePct || 0),
    avgSlopePct: Number(elevation?.avgSlopePct || 0),
    terrainType: constraints?.terrainType || 'mixed',
    surfaceType: constraints?.surfaceType || 'unknown',
    trailCondition: constraints?.trailCondition || 'unknown',
    riverCrossingCount: Number(constraints?.riverCrossingCount || 0),
    cliffExposureCount: Number(constraints?.cliffExposureCount || 0),
    closureCount: Number(constraints?.closureCount || 0),
    raw: {
      elevationPoints: elevation?.points?.length || 0,
      constraintMeta: constraints?.raw || {},
    },
  };

  await upsertRouteGeographyProfile(routeHash, profile).catch(() => null);
  return profile;
}
