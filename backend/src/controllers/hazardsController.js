import { getHazardsForRequest } from '../modules/hazards/services/hazardAggregator.js';

export async function getRealtimeHazards(req, res) {
  try {
    const payload = await getHazardsForRequest({
      bboxParam: req.query.bbox,
      layersParam: req.query.layers,
    });

    res.json(payload);
  } catch (error) {
    console.error('Hazard endpoint failed:', error.message);
    res.status(500).json({
      hazards: [],
      error: 'Failed to fetch hazards',
    });
  }
}
