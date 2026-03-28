import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';

function estimateHikingDurationMin(distanceKm) {
  const normalizedDistance = Math.max(Number(distanceKm) || 0, 0);
  if (normalizedDistance === 0) return 0;

  const baseSpeed = Math.max(config.hikingBaseSpeedKmh || 4.5, 2.5);
  const movingMinutes = (normalizedDistance / baseSpeed) * 60;
  const plannedBreakMinutes = Math.floor(normalizedDistance / 10) * 12;
  return Number((movingMinutes + plannedBreakMinutes).toFixed(1));
}

function toRouteShape(route, index) {
  const coordinates = route?.geometry?.coordinates || [];
  const geometry = coordinates
    .map(([lng, lat]) => [lat, lng])
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));

  const distanceKm = Number(((route?.distance || 0) / 1000).toFixed(2));
  const rawDurationMin = Number(((route?.duration || 0) / 60).toFixed(1));
  const hikingDurationMin = estimateHikingDurationMin(distanceKm);

  return {
    id: `route-${index + 1}`,
    geometry,
    distanceKm,
    durationMin: Number(Math.max(rawDurationMin, hikingDurationMin).toFixed(1)),
    rawDurationMin,
    hikingDurationMin,
    travelProfile: config.osrmRouteProfile,
  };
}

function buildRouteUrl(points, { alternatives }) {
  const coords = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = new URL(`/route/v1/${config.osrmRouteProfile}/${coords}`, config.osrmApiBaseUrl);
  url.searchParams.set('alternatives', alternatives ? 'true' : 'false');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');
  return url.toString();
}

export async function fetchOsrmRoutes(points, { alternatives = false } = {}) {
  const url = buildRouteUrl(points, { alternatives });
  const payload = await fetchJson(url);
  const routes = Array.isArray(payload?.routes) ? payload.routes : [];
  return routes.map((route, index) => toRouteShape(route, index)).filter((route) => route.geometry.length >= 2);
}
