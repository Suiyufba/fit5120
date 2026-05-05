export const normalizeLayer = (value) => String(value || '').trim().toLowerCase();

export const parseLayers = (layersParam, defaultLayers) => {
  if (!layersParam) {
    return new Set(defaultLayers.map(normalizeLayer));
  }

  return new Set(
    layersParam
      .split(',')
      .map((item) => normalizeLayer(item))
      .filter(Boolean)
  );
};

export const parseBbox = (bboxParam) => {
  if (!bboxParam) return null;
  const nums = bboxParam.split(',').map((n) => Number.parseFloat(n.trim()));
  if (nums.length !== 4 || nums.some(Number.isNaN)) return null;

  const [minLng, minLat, maxLng, maxLat] = nums;
  return { minLng, minLat, maxLng, maxLat };
};

export const inBbox = (coordinates, bbox) => {
  if (!bbox) return true;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return false;

  const [lat, lng] = coordinates;
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat;
};

export const nowIso = () => new Date().toISOString();

export const toSeverity = (value) => {
  const raw = String(value || '').toLowerCase();
  if (['extreme', 'severe', 'emergency', 'catastrophic'].includes(raw)) return 'extreme';
  if (['high', 'warning', 'watch and act', 'watch-and-act'].includes(raw)) return 'high';
  if (['watch', 'moderate', 'medium', 'advice'].includes(raw)) return 'moderate';
  return 'low';
};

export const layerAliases = {
  fire: ['fire', 'bushfire', 'smoke', 'grassfire', 'grass fire', 'scrub fire'],
  flood: ['flood', 'inundation', 'flash flood', 'heavy rain', 'rainfall'],
  storm: ['storm', 'thunderstorm', 'hail', 'wind'],
  heat: ['heat', 'heatwave', 'temperature', 'hot weather']
};

export const inferType = (text) => {
  const candidate = String(text || '').toLowerCase();
  for (const [type, aliases] of Object.entries(layerAliases)) {
    if (aliases.some((alias) => candidate.includes(alias))) {
      return type;
    }
  }
  return 'other';
};

export const sanitizeHazard = (hazard) => ({
  id: String(hazard.id),
  type: normalizeLayer(hazard.type),
  severity: ['low', 'moderate', 'high', 'extreme'].includes(hazard.severity) ? hazard.severity : 'low',
  title: String(hazard.title || 'Untitled event'),
  riskCategory: String(hazard.riskCategory || hazard.category || '').trim(),
  description: String(hazard.description || ''),
  source: String(hazard.source || 'Unknown'),
  sourceUrl: String(hazard.sourceUrl || ''),
  updatedAt: hazard.updatedAt || nowIso(),
  coordinates: Array.isArray(hazard.coordinates) ? hazard.coordinates : null,
  feelsLike: Number.isFinite(Number(hazard.feelsLike)) ? Number(hazard.feelsLike) : undefined,
});
