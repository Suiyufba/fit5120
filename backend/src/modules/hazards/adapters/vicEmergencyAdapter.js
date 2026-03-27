import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { inferType, sanitizeHazard, toSeverity } from '../domain/hazardUtils.js';

export async function fetchVicEmergencyHazards() {
  if (!config.vicEmergencyFeedUrl) return [];

  const headers = config.vicEmergencyApiKey
    ? { Authorization: `Bearer ${config.vicEmergencyApiKey}` }
    : {};

  const payload = await fetchJson(config.vicEmergencyFeedUrl, { headers });
  const items = payload?.hazards || payload?.events || payload?.features || [];

  return items
    .map((item, index) => {
      const point = item.coordinates || item?.geometry?.coordinates;
      if (!Array.isArray(point) || point.length < 2) return null;

      const maybeLngLat = Math.abs(point[0]) <= 90 && Math.abs(point[1]) > 90 ? [point[1], point[0]] : point;
      const normalized = [maybeLngLat[1], maybeLngLat[0]];

      const title = item.title || item.name || 'VicEmergency event';
      return sanitizeHazard({
        id: `vicem-${item.id || index}`,
        type: item.type || inferType(`${title} ${item.category || ''}`),
        severity: toSeverity(item.severity || item.level),
        title,
        description: item.description || item.summary || '',
        source: 'VicEmergency',
        sourceUrl: item.sourceUrl || 'https://emergency.vic.gov.au/',
        updatedAt: item.updatedAt || item.updated || new Date().toISOString(),
        coordinates: normalized
      });
    })
    .filter(Boolean);
}
