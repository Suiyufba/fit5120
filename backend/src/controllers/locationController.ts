import type { Request, Response } from 'express';
import { reverseLocation, searchLocationsByText } from '../modules/locations/services/locationSearchService.js';

export async function getLocationSearch(req: Request, res: Response): Promise<void> {
  try {
    const query = String(req.query?.q || '').trim();
    if (!query || query.length < 2) {
      res.json({ results: [] });
      return;
    }
    const results = await searchLocationsByText({
      query,
      limit: Number(req.query?.limit || 6),
    });
    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ results: [], error: message || 'Location search failed' });
  }
}

export async function getLocationReverse(req: Request, res: Response): Promise<void> {
  try {
    const result = await reverseLocation({
      lat: Number(req.query?.lat),
      lng: Number(req.query?.lng),
    });
    res.json({ result: result || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Invalid') || message.includes('Victoria') ? 400 : 500;
    res.status(status).json({ result: null, error: message || 'Location reverse lookup failed' });
  }
}
