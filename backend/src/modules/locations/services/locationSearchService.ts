// @ts-nocheck
import { fetchJson } from '../../../shared/http/fetchJson.js';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io';
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_MAX_ITEMS = 120;
const VICTORIA_BBOX = {
  minLat: -39.45,
  maxLat: -33.85,
  minLng: 140.85,
  maxLng: 150.05,
};
const searchCache = new Map();

function inVictoria({ lat, lng }) {
  return lat >= VICTORIA_BBOX.minLat
    && lat <= VICTORIA_BBOX.maxLat
    && lng >= VICTORIA_BBOX.minLng
    && lng <= VICTORIA_BBOX.maxLng;
}

function buildDisplayName(item: any = {}) {
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

function normalizeSearchResult(item: any) {
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

function normalizePhotonResult(feature: any) {
  const coordinates = feature?.geometry?.coordinates;
  const lng = Number(coordinates?.[0]);
  const lat = Number(coordinates?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!inVictoria({ lat, lng })) return null;

  const properties = feature?.properties || {};
  const parts = [
    properties.name,
    properties.street,
    properties.district || properties.city || properties.county,
    properties.state,
    properties.country,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  return {
    displayName: parts.length ? [...new Set(parts)].join(', ') : 'Unnamed location',
    lat,
    lng,
  };
}

function dedupeAndLimit(items, limit) {
  const seen = new Set();
  return items
    .filter(Boolean)
    .filter((item) => {
      const key = `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function getCachedSearch(cacheKey) {
  const cached = searchCache.get(cacheKey);
  if (!cached || Date.now() - cached.createdAt > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(cacheKey);
    return null;
  }
  return cached.results;
}

function setCachedSearch(cacheKey, results) {
  searchCache.set(cacheKey, {
    createdAt: Date.now(),
    results,
  });
  while (searchCache.size > SEARCH_CACHE_MAX_ITEMS) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
}

async function searchNominatim(q, safeLimit) {
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

  return Array.isArray(payload)
    ? payload.map(normalizeSearchResult)
    : [];
}

async function searchPhoton(q, safeLimit) {
  const params = new URLSearchParams({
    q,
    limit: String(safeLimit * 2),
    lat: '-37.8136',
    lon: '144.9631',
  });

  const payload = await fetchJson(`${PHOTON_BASE_URL}/api/?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'HikeShield/1.0 (location-search)',
    },
    timeoutMs: 8000,
  });

  return Array.isArray(payload?.features)
    ? payload.features.map(normalizePhotonResult)
    : [];
}

export async function searchLocationsByText({ query, limit = 6 }) {
  const q = String(query || '').trim();
  if (!q) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));
  const cacheKey = `${q.toLowerCase()}|${safeLimit}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) return cached;

  let results = [];
  try {
    results = await searchNominatim(q, safeLimit);
  } catch (_error) {
    results = [];
  }

  if (!results.length) {
    try {
      results = await searchPhoton(q, safeLimit);
    } catch (_error) {
      results = [];
    }
  }

  const normalized = dedupeAndLimit(results, safeLimit);
  setCachedSearch(cacheKey, normalized);
  return normalized;
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
