import { config } from '../../../config/index.js';
import { fetchBomHazards } from '../adapters/bomAdapter.js';
import { fetchVicEmergencyHazards } from '../adapters/vicEmergencyAdapter.js';
import { fetchVicRoadsHazards } from '../adapters/vicRoadsAdapter.js';
import {
  getLatestHazardSnapshot,
  saveLatestHazardSnapshot,
} from '../../../infrastructure/db/hazardSnapshotRepository.js';
import { inBbox, parseBbox, parseLayers, sanitizeHazard } from '../domain/hazardUtils.js';
import { listManualHazards } from '../repositories/manualHazardRepository.js';
import type { HazardSnapshot, HazardApiResponse, HazardSourceStatus } from 'hikeshield-shared';

interface ProviderResult {
  name: string;
  run: () => Promise<unknown[]>;
}

let latestSnapshot: HazardSnapshot = {
  hazards: [],
  fetchedAt: new Date().toISOString(),
  fromFallback: false,
  sourceStatus: [],
  lastError: 'No successful upstream snapshot yet',
};

async function pullProviders(): Promise<HazardSnapshot> {
  const providers: ProviderResult[] = [
    { name: 'DataVic Road Disruptions', run: fetchVicRoadsHazards },
    { name: 'OpenWeather Conditions', run: fetchBomHazards },
    { name: 'VicEmergency', run: fetchVicEmergencyHazards },
  ];
  const providerResults = await Promise.allSettled(providers.map((provider) => provider.run()));

  const hazards: ReturnType<typeof sanitizeHazard>[] = [];
  const sourceStatus: HazardSourceStatus[] = [];

  for (let index = 0; index < providerResults.length; index += 1) {
    const providerName = providers[index].name;
    const result = providerResults[index];
    if (result.status === 'fulfilled') {
      const sanitized = result.value.map((h: Record<string, unknown>) => sanitizeHazard(h)).filter(
        (hazard) => Array.isArray(hazard.coordinates),
      );
      hazards.push(...sanitized);
      sourceStatus.push({
        name: providerName,
        ok: true,
        count: sanitized.length,
        error: null,
      });
    } else {
      sourceStatus.push({
        name: providerName,
        ok: false,
        count: 0,
        error: result.reason?.message || 'Unknown upstream error',
      });
    }
  }

  const dedupedHazards = hazards.filter((hazard, index, arr) => {
    const key = `${hazard.id}|${hazard.type}|${hazard.coordinates[0]}|${hazard.coordinates[1]}`;
    return arr.findIndex(
      (h) => `${h.id}|${h.type}|${h.coordinates[0]}|${h.coordinates[1]}` === key,
    ) === index;
  });

  if (!dedupedHazards.length) {
    return {
      hazards: [],
      fetchedAt: new Date().toISOString(),
      fromFallback: false,
      sourceStatus,
      lastError: 'All providers unavailable or returned empty payloads',
    };
  }

  return {
    hazards: dedupedHazards,
    fetchedAt: new Date().toISOString(),
    fromFallback: false,
    sourceStatus,
    lastError: sourceStatus.some((source) => !source.ok) ? 'Partial upstream failure' : null,
  };
}

export async function refreshHazardSnapshot(): Promise<HazardSnapshot> {
  try {
    latestSnapshot = await pullProviders();
    await saveLatestHazardSnapshot(latestSnapshot);
  } catch (error) {
    console.error('Failed to refresh hazard snapshot:', (error as Error).message);
  }

  return latestSnapshot;
}

export interface HazardRequestParams {
  bboxParam?: string;
  layersParam?: string;
}

export async function getHazardsForRequest({
  bboxParam,
  layersParam,
}: HazardRequestParams): Promise<HazardApiResponse> {
  const bbox = parseBbox(bboxParam);
  const layers = parseLayers(layersParam, config.defaultLayers);
  const snapshot = (await getLatestHazardSnapshot()) || latestSnapshot;
  const manualHazards = await listManualHazards({ includeInactive: false });
  const mergedHazards = [...snapshot.hazards, ...manualHazards];

  const hazards = mergedHazards
    .filter((hazard) => layers.has(hazard.type))
    .filter((hazard) => inBbox(hazard.coordinates, bbox));
  const fetchedAtTs = Date.parse(snapshot.fetchedAt);
  const ageMs = Number.isNaN(fetchedAtTs) ? null : Math.max(Date.now() - fetchedAtTs, 0);

  return {
    hazards,
    fetchedAt: snapshot.fetchedAt,
    fromFallback: snapshot.fromFallback,
    isStale: ageMs !== null ? ageMs > config.staleThresholdMs : true,
    meta: {
      count: hazards.length,
      totalBeforeFilter: mergedHazards.length,
      sourceStatus: snapshot.sourceStatus || [],
      lastError: snapshot.lastError || null,
      ageMs,
    },
  };
}

export function startScheduler(): void {
  refreshHazardSnapshot();

  setInterval(() => {
    refreshHazardSnapshot();
  }, config.fetchIntervalMs).unref();
}
