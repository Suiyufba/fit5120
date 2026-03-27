import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { inferType, sanitizeHazard, toSeverity } from '../domain/hazardUtils.js';

export async function fetchBomHazards() {
  if (!config.bomFeedUrl) return [];

  const payload = await fetchJson(config.bomFeedUrl);
  const items = payload?.hazards || payload?.features || payload?.items || [];

  return items
    .map((item, index) => {
      const coords = item.coordinates || item?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;

      const maybeLngLat = Math.abs(coords[0]) <= 90 && Math.abs(coords[1]) > 90 ? [coords[1], coords[0]] : coords;
      const normalized = [maybeLngLat[1], maybeLngLat[0]];

      const title = item.title || item.name || 'BoM warning';
      return sanitizeHazard({
        id: `bom-${item.id || index}`,
        type: item.type || inferType(title),
        severity: toSeverity(item.severity || item.level),
        title,
        description: item.description || item.summary || '',
        source: 'BoM',
        sourceUrl: item.sourceUrl || 'https://www.bom.gov.au/',
        updatedAt: item.updatedAt || item.updated || new Date().toISOString(),
        coordinates: normalized
      });
    })
    .filter(Boolean);
}
