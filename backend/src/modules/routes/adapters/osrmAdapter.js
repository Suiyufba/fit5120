import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { estimateHikingDurationMin } from '../domain/routeTiming.js';

const OSRM_TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const OSRM_RETRY_ATTEMPTS = 2;
const OSRM_RETRY_DELAY_MS = 300;
const OSRM_FALLBACK_PROFILES = ['walking', 'driving'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractHttpStatus(error) {
  const message = String(error?.message || '');
  const match = message.match(/HTTP\s+(\d{3})/i);
  if (!match) return null;
  const status = Number.parseInt(match[1], 10);
  return Number.isFinite(status) ? status : null;
}

function isTransientOsrmError(error) {
  if (error?.name === 'AbortError') return true;
  const status = extractHttpStatus(error);
  return status != null ? OSRM_TRANSIENT_STATUS.has(status) : false;
}

function buildProfileCandidates() {
  return [config.osrmRouteProfile, ...OSRM_FALLBACK_PROFILES]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function toRouteShape(route, index, travelProfile) {
  const coordinates = route?.geometry?.coordinates || [];
  const geometry = coordinates
    .map(([lng, lat]) => [lat, lng])
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));

  const distanceKm = Number(((route?.distance || 0) / 1000).toFixed(2));
  const rawDurationMin = Number(((route?.duration || 0) / 60).toFixed(1));
  // Provisional hiking estimate (no geography yet). The planner re-fits this
  // after the elevation profile is fetched.
  const provisionalDurationMin = estimateHikingDurationMin({
    distanceKm,
    fallbackSpeedKmh: config.hikingBaseSpeedKmh,
    floorMin: rawDurationMin,
  });

  return {
    id: `route-${index + 1}`,
    geometry,
    distanceKm,
    durationMin: Number(Math.max(rawDurationMin, provisionalDurationMin).toFixed(1)),
    rawDurationMin,
    provisionalDurationMin,
    travelProfile,
  };
}

function buildRouteUrl(points, { alternatives, travelProfile }) {
  const coords = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = new URL(`/route/v1/${travelProfile}/${coords}`, config.osrmApiBaseUrl);
  url.searchParams.set('alternatives', alternatives ? 'true' : 'false');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');
  return url.toString();
}

async function fetchRoutesByProfile(points, { alternatives, travelProfile }) {
  const url = buildRouteUrl(points, { alternatives, travelProfile });
  const payload = await fetchJson(url);
  const routes = Array.isArray(payload?.routes) ? payload.routes : [];
  return routes
    .map((route, index) => toRouteShape(route, index, travelProfile))
    .filter((route) => route.geometry.length >= 2);
}

export async function fetchOsrmRoutes(points, { alternatives = false } = {}) {
  const profileCandidates = buildProfileCandidates();
  const errors = [];

  for (const travelProfile of profileCandidates) {
    for (let attempt = 1; attempt <= OSRM_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await fetchRoutesByProfile(points, { alternatives, travelProfile });
      } catch (error) {
        const isTransient = isTransientOsrmError(error);
        errors.push(`${travelProfile}#${attempt}: ${error.message}`);
        const shouldRetry = isTransient && attempt < OSRM_RETRY_ATTEMPTS;
        if (!shouldRetry) break;
        await sleep(OSRM_RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(`OSRM route service unavailable (${errors.join(' | ')})`);
}
