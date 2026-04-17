import { reverseLocation, searchLocationsByText } from '../modules/locations/services/locationSearchService.js';

export async function getLocationSearch(req, res) {
  try {
    const query = String(req.query?.q || '').trim();
    if (!query || query.length < 2) {
      res.json({ results: [] });
      return;
    }
    const results = await searchLocationsByText({
      query,
      limit: req.query?.limit || 6,
    });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ results: [], error: error.message || 'Location search failed' });
  }
}

export async function getLocationReverse(req, res) {
  try {
    const result = await reverseLocation({
      lat: req.query?.lat,
      lng: req.query?.lng,
    });
    res.json({ result: result || null });
  } catch (error) {
    const status = error.message?.includes('Invalid') || error.message?.includes('Victoria') ? 400 : 500;
    res.status(status).json({ result: null, error: error.message || 'Location reverse lookup failed' });
  }
}
