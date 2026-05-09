import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { estimateHikingDurationMin } from '../domain/routeTiming.js';

const ORS_TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const ORS_RETRY_ATTEMPTS = 2;
const ORS_RETRY_DELAY_MS = 300;
const ORS_FALLBACK_PROFILES = ['foot-walking', 'driving-car'];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractHttpStatus(error: any) {
  const message = String(error?.message || '');
  const match = message.match(/HTTP\s+(\d{3})/i);
  if (!match) return null;
  const status = Number.parseInt(match[1], 10);
  return Number.isFinite(status) ? status : null;
}

function isTransientOpenRouteServiceError(error: any) {
  if (error?.name === 'AbortError') return true;
  const status = extractHttpStatus(error);
  return status != null ? ORS_TRANSIENT_STATUS.has(status) : false;
}

function normalizeProfile(profile: string) {
  const value = String(profile || '').trim().toLowerCase();
  if (value === 'foot' || value === 'walking') return 'foot-walking';
  if (value === 'hiking') return 'foot-hiking';
  if (value === 'driving') return 'driving-car';
  return value;
}

function buildProfileCandidates() {
  return [config.openRouteServiceProfile, ...ORS_FALLBACK_PROFILES]
    .map(normalizeProfile)
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function toRouteShape(feature: any, index: number, travelProfile: string) {
  const summary = feature?.properties?.summary || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const geometry = coordinates
    .map(([lng, lat]) => [lat, lng])
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));

  const distanceKm = Number(((summary.distance || 0) / 1000).toFixed(2));
  const rawDurationMin = Number(((summary.duration || 0) / 60).toFixed(1));
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

function buildDirectionsUrl(travelProfile: string) {
  const baseUrl = String(config.openRouteServiceApiBaseUrl || '').replace(/\/+$/, '');
  return `${baseUrl}/v2/directions/${travelProfile}/geojson`;
}

function buildDirectionsBody(points: unknown[], { alternatives }: { alternatives: boolean }) {
  const body: any = {
    coordinates: points.map((point: any) => [point.lng, point.lat]),
    instructions: false,
    preference: 'recommended',
    radiuses: points.map(() => config.openRouteServiceSnapRadiusM),
    units: 'm',
  };

  if (alternatives) {
    body.alternative_routes = {
      target_count: 3,
      share_factor: 0.6,
      weight_factor: 1.4,
    };
  }

  return body;
}

async function fetchRoutesByProfile(points: unknown[], { alternatives, travelProfile }: { alternatives: boolean; travelProfile: string }) {
  const url = buildDirectionsUrl(travelProfile);
  const payload = await fetchJson(url, {
    method: 'POST',
    headers: {
      Accept: 'application/geo+json, application/json',
      Authorization: config.openRouteServiceApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildDirectionsBody(points, { alternatives })),
  });
  const features = Array.isArray((payload as any)?.features) ? (payload as any).features : [];
  return features
    .map((feature, index) => toRouteShape(feature, index, travelProfile))
    .filter((route) => route.geometry.length >= 2);
}

export async function fetchOpenRouteServiceRoutes(points: unknown[], { alternatives = false }: { alternatives?: boolean } = {}) {
  const profileCandidates = buildProfileCandidates();
  const errors = [];

  for (const travelProfile of profileCandidates) {
    for (let attempt = 1; attempt <= ORS_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await fetchRoutesByProfile(points, { alternatives, travelProfile });
      } catch (error) {
        const isTransient = isTransientOpenRouteServiceError(error);
        errors.push(`${travelProfile}#${attempt}: ${error.message}`);
        const shouldRetry = isTransient && attempt < ORS_RETRY_ATTEMPTS;
        if (!shouldRetry) break;
        await sleep(ORS_RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(`OpenRouteService route service unavailable (${errors.join(' | ')})`);
}
