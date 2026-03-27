import { config } from '../../../config/index.js';
import { fetchBomHazards } from '../adapters/bomAdapter.js';
import { fetchVicEmergencyHazards } from '../adapters/vicEmergencyAdapter.js';
import { fetchVicRoadsHazards } from '../adapters/vicRoadsAdapter.js';
import { fallbackHazards } from '../data/fallbackHazards.js';
import { getCache } from '../../../infrastructure/cache/index.js';
import { inBbox, parseBbox, parseLayers, sanitizeHazard } from '../domain/hazardUtils.js';

const CACHE_KEY = 'hazards:realtime';

let latestSnapshot = {
  hazards: fallbackHazards,
  fetchedAt: new Date().toISOString(),
  fromFallback: true,
  sourceStatus: [],
  lastError: null
};

const cache = getCache();

async function pullProviders() {
  const providers = [
    { name: 'DataVic Road Disruptions', run: fetchVicRoadsHazards },
    { name: 'BoM Warnings', run: fetchBomHazards },
    { name: 'VicEmergency', run: fetchVicEmergencyHazards }
  ];
  const providerResults = await Promise.allSettled(providers.map((provider) => provider.run()));

  const hazards = [];
  const sourceStatus = [];

  for (let index = 0; index < providerResults.length; index += 1) {
    const providerName = providers[index].name;
    const result = providerResults[index];
    if (result.status === 'fulfilled') {
      const sanitized = result.value.map(sanitizeHazard).filter((hazard) => Array.isArray(hazard.coordinates));
      hazards.push(...sanitized);
      sourceStatus.push({
        name: providerName,
        ok: true,
        count: sanitized.length,
        error: null
      });
    } else {
      sourceStatus.push({
        name: providerName,
        ok: false,
        count: 0,
        error: result.reason?.message || 'Unknown upstream error'
      });
    }
  }

  const dedupedHazards = hazards.filter((hazard, index, arr) => {
    const key = `${hazard.id}|${hazard.type}|${hazard.coordinates[0]}|${hazard.coordinates[1]}`;
    return arr.findIndex((h) => `${h.id}|${h.type}|${h.coordinates[0]}|${h.coordinates[1]}` === key) === index;
  });

  if (!hazards.length) {
    return {
      hazards: fallbackHazards.map(sanitizeHazard),
      fetchedAt: new Date().toISOString(),
      fromFallback: true,
      sourceStatus,
      lastError: 'All providers unavailable or returned empty payloads'
    };
  }

  return {
    hazards: dedupedHazards,
    fetchedAt: new Date().toISOString(),
    fromFallback: false,
    sourceStatus,
    lastError: sourceStatus.some((source) => !source.ok) ? 'Partial upstream failure' : null
  };
}

export async function refreshHazardSnapshot() {
  try {
    latestSnapshot = await pullProviders();
    await cache.set(CACHE_KEY, latestSnapshot);
  } catch (error) {
    console.error('Failed to refresh hazard snapshot:', error.message);
  }

  return latestSnapshot;
}

export async function getHazardsForRequest({ bboxParam, layersParam }) {
  const bbox = parseBbox(bboxParam);
  const layers = parseLayers(layersParam, config.defaultLayers);

  const cached = (await cache.get(CACHE_KEY)) || latestSnapshot;

  const hazards = cached.hazards
    .filter((hazard) => layers.has(hazard.type))
    .filter((hazard) => inBbox(hazard.coordinates, bbox));

  return {
    hazards,
    fetchedAt: cached.fetchedAt,
    fromFallback: cached.fromFallback,
    meta: {
      count: hazards.length,
      totalBeforeFilter: cached.hazards.length,
      sourceStatus: cached.sourceStatus || [],
      lastError: cached.lastError || null
    }
  };
}

export function startScheduler() {
  refreshHazardSnapshot();

  setInterval(() => {
    refreshHazardSnapshot();
  }, config.fetchIntervalMs).unref();
}
