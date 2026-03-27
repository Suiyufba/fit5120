import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { inferType, sanitizeHazard, toSeverity } from '../domain/hazardUtils.js';

const toCoords = (record) => {
  const lat = Number.parseFloat(record.latitude || record.lat || record.LATITUDE);
  const lng = Number.parseFloat(record.longitude || record.lon || record.lng || record.LONGITUDE);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
};

export async function fetchVicRoadsHazards() {
  if (!config.vicroadsApiUrl) return [];

  const payload = await fetchJson(config.vicroadsApiUrl);
  const records = payload?.result?.records || payload?.records || [];

  return records
    .map((record, index) => {
      const title = record.event_type || record.description || record.title || 'Road disruption';
      const type = inferType(`${record.event_type || ''} ${record.subcategory || ''} ${title}`);
      const coords = toCoords(record);

      if (!coords) return null;

      return sanitizeHazard({
        id: `vicroads-${record.id || record._id || index}`,
        type,
        severity: toSeverity(record.severity || record.risk || record.impact),
        title,
        description: record.description || record.details || 'Unplanned road disruption',
        source: 'DataVic',
        sourceUrl: 'https://www.data.vic.gov.au/',
        updatedAt: record.updated_at || record.last_updated || new Date().toISOString(),
        coordinates: coords
      });
    })
    .filter(Boolean);
}
