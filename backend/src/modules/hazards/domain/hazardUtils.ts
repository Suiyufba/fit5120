import type { Hazard, HazardSeverity, HazardType } from 'hikeshield-shared';

export const normalizeLayer = (value: string): string => String(value || '').trim().toLowerCase();

export const parseLayers = (layersParam: string | undefined | null, defaultLayers: string[]): Set<string> => {
  if (!layersParam) {
    return new Set(defaultLayers.map(normalizeLayer));
  }

  return new Set(
    layersParam
      .split(',')
      .map((item) => normalizeLayer(item))
      .filter(Boolean),
  );
};

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export const parseBbox = (bboxParam: string | undefined | null): Bbox | null => {
  if (!bboxParam) return null;
  const nums = bboxParam.split(',').map((n) => Number.parseFloat(n.trim()));
  if (nums.length !== 4 || nums.some(Number.isNaN)) return null;

  const [minLng, minLat, maxLng, maxLat] = nums;
  return { minLng, minLat, maxLng, maxLat };
};

export const inBbox = (coordinates: [number, number] | null, bbox: Bbox | null | undefined): boolean => {
  if (!bbox) return true;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return false;

  const [lat, lng] = coordinates;
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat;
};

export const nowIso = (): string => new Date().toISOString();

export const toSeverity = (value: string): HazardSeverity => {
  const raw = String(value || '').toLowerCase();
  if (['extreme', 'severe', 'emergency', 'catastrophic'].includes(raw)) return 'extreme';
  if (['high', 'warning', 'watch and act', 'watch-and-act'].includes(raw)) return 'high';
  if (['watch', 'moderate', 'medium', 'advice'].includes(raw)) return 'moderate';
  return 'low';
};

export const layerAliases: Record<string, string[]> = {
  fire: ['fire', 'bushfire', 'smoke', 'grassfire', 'grass fire', 'scrub fire'],
  flood: ['flood', 'inundation', 'flash flood', 'heavy rain', 'rainfall'],
  storm: ['storm', 'thunderstorm', 'hail', 'wind'],
  heat: ['heat', 'heatwave', 'temperature', 'hot weather'],
};

export const inferType = (text: string): string => {
  const candidate = String(text || '').toLowerCase();
  for (const [type, aliases] of Object.entries(layerAliases)) {
    if (aliases.some((alias) => candidate.includes(alias))) {
      return type;
    }
  }
  return 'other';
};

export interface SanitizedHazard extends Hazard {
  riskCategory: string;
}

export const sanitizeHazard = (hazard: Record<string, unknown>): SanitizedHazard => ({
  id: String(hazard.id ?? ''),
  type: normalizeLayer(String(hazard.type ?? '')) as HazardType,
  severity: (
    ['low', 'moderate', 'high', 'extreme'].includes(String(hazard.severity ?? ''))
      ? String(hazard.severity)
      : 'low'
  ) as HazardSeverity,
  title: String(hazard.title || 'Untitled event'),
  riskCategory: String((hazard.riskCategory as string) || (hazard.category as string) || '').trim(),
  description: String(hazard.description || ''),
  source: String(hazard.source || 'Unknown'),
  sourceUrl: String(hazard.sourceUrl || ''),
  updatedAt: String(hazard.updatedAt || nowIso()),
  coordinates: (Array.isArray(hazard.coordinates) ? hazard.coordinates : [0, 0]) as [number, number],
  feelsLike: Number.isFinite(Number(hazard.feelsLike)) ? Number(hazard.feelsLike) : undefined,
});
