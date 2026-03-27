import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';

function toRouteShape(route, index) {
  const coordinates = route?.geometry?.coordinates || [];
  const geometry = coordinates
    .map(([lng, lat]) => [lat, lng])
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));

  return {
    id: `route-${index + 1}`,
    geometry,
    distanceKm: Number(((route?.distance || 0) / 1000).toFixed(2)),
    durationMin: Number(((route?.duration || 0) / 60).toFixed(1))
  };
}

function buildRouteUrl(points, { alternatives }) {
  const coords = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = new URL(`/route/v1/driving/${coords}`, config.osrmApiBaseUrl);
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
