import { getHazardsForRequest } from '../modules/hazards/services/hazardAggregator.js';

const ALLOWED_LAYERS = new Set(['fire', 'flood', 'storm', 'heat', 'trail', 'other']);

function isValidBbox(bbox) {
  const parts = String(bbox || '')
    .split(',')
    .map((value) => Number(value.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return false;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) return false;
  if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) return false;
  return minLng < maxLng && minLat < maxLat;
}

function isValidLayers(layers) {
  if (!layers) return true;
  const values = String(layers)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return values.length > 0 && values.every((value) => ALLOWED_LAYERS.has(value));
}

export async function getRealtimeHazards(req, res) {
  try {
    if (req.query?.bbox && !isValidBbox(req.query.bbox)) {
      res.status(400).json({ hazards: [], error: 'Invalid bbox format' });
      return;
    }
    if (!isValidLayers(req.query?.layers)) {
      res.status(400).json({ hazards: [], error: 'Invalid layers format' });
      return;
    }

    const payload = await getHazardsForRequest({
      bboxParam: req.query.bbox,
      layersParam: req.query.layers,
    });

    res.json(payload);
  } catch (error) {
    console.error('Hazard endpoint failed:', error);
    res.status(500).json({
      hazards: [],
      error: 'Failed to fetch hazards',
    });
  }
}
