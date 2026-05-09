import type { Request, Response } from 'express';
import { getHazardsForRequest } from '../modules/hazards/services/hazardAggregator.js';
import { listHazardSnapshotHistory } from '../infrastructure/db/hazardSnapshotRepository.js';

const ALLOWED_LAYERS = new Set(['fire', 'flood', 'storm', 'heat', 'trail', 'other']);

function isValidBbox(bbox: unknown): boolean {
  const parts = String(bbox || '')
    .split(',')
    .map((value) => Number(value.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return false;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) return false;
  if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) return false;
  return minLng < maxLng && minLat < maxLat;
}

function isValidLayers(layers: unknown): boolean {
  if (!layers) return true;
  const values = String(layers)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return values.length > 0 && values.every((value) => ALLOWED_LAYERS.has(value));
}

export async function getRealtimeHazards(req: Request, res: Response): Promise<void> {
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
      bboxParam: req.query.bbox as string | undefined,
      layersParam: req.query.layers as string | undefined,
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

export async function getHazardHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query?.limit || 24);
    if (!Number.isFinite(limit) || limit <= 0) {
      res.status(400).json({ snapshots: [], error: 'Invalid limit format' });
      return;
    }

    const snapshots = await listHazardSnapshotHistory({ limit });
    res.json({
      snapshots,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Hazard history endpoint failed:', error);
    res.status(500).json({
      snapshots: [],
      error: 'Failed to fetch hazard history',
    });
  }
}
