import { fetchJson } from '../../../shared/http/fetchJson.js';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const VICTORIA_BBOX = {
  minLat: -39.45,
  maxLat: -33.85,
  minLng: 140.85,
  maxLng: 150.05,
};

function inVictoria({ lat, lng }) {
  return lat >= VICTORIA_BBOX.minLat
    && lat <= VICTORIA_BBOX.maxLat
    && lng >= VICTORIA_BBOX.minLng
    && lng <= VICTORIA_BBOX.maxLng;
}

function buildDisplayName(item = {}) {
  const direct = String(item?.display_name || '').trim();
  if (direct) return direct;

  const address = item?.address || {};
  const parts = [
    address.road,
    address.suburb || address.village || address.hamlet,
    address.town || address.city || address.county,
    address.state,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  if (parts.length) return parts.join(', ');
  const named = String(item?.name || '').trim();
  if (named) return named;
  return '';
}

function normalizeSearchResult(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!inVictoria({ lat, lng })) return null;

  return {
    displayName: buildDisplayName(item) || 'Unnamed location',
    lat,
    lng,
  };
}

export async function searchLocationsByText({ query, limit = 6 }) {
  const q = String(query || '').trim();
  if (!q) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(safeLimit * 2),
    countrycodes: 'au',
    bounded: '1',
    viewbox: `${VICTORIA_BBOX.minLng},${VICTORIA_BBOX.maxLat},${VICTORIA_BBOX.maxLng},${VICTORIA_BBOX.minLat}`,
  });

  const payload = await fetchJson(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'HikeShield/1.0 (location-search)',
    },
    timeoutMs: 8000,
  });

  const seen = new Set();
  const normalized = Array.isArray(payload)
    ? payload
      .map(normalizeSearchResult)
      .filter(Boolean)
      .filter((item) => {
        const key = `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    : [];

  return normalized.slice(0, safeLimit);
}

export async function reverseLocation({ lat, lng }) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw new Error('Invalid lat/lng');
  }
  if (!inVictoria({ lat: parsedLat, lng: parsedLng })) {
    throw new Error('Point must be inside Victoria');
  }

  const tryReverse = async (zoom) => {
    const params = new URLSearchParams({
      lat: String(parsedLat),
      lon: String(parsedLng),
      format: 'jsonv2',
      zoom: String(zoom),
      addressdetails: '1',
      namedetails: '1',
    });
    return fetchJson(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HikeShield/1.0 (location-reverse)',
      },
      timeoutMs: 8000,
    });
  };

  const zoomLevels = [16, 14, 12, 10];
  for (const zoom of zoomLevels) {
    try {
      const payload = await tryReverse(zoom);
      const displayName = buildDisplayName(payload);
      if (!displayName) continue;
      const normalizedLat = Number(payload?.lat);
      const normalizedLng = Number(payload?.lon);
      return {
        displayName,
        lat: Number.isFinite(normalizedLat) ? normalizedLat : parsedLat,
        lng: Number.isFinite(normalizedLng) ? normalizedLng : parsedLng,
      };
    } catch (_error) {
      // Try next zoom level.
    }
  }

  return {
    displayName: 'Dropped pin location',
    lat: parsedLat,
    lng: parsedLng,
  };
}
