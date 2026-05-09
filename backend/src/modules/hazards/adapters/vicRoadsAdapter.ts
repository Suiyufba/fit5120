import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { inferType, sanitizeHazard, toSeverity } from '../domain/hazardUtils.js';

const toCoords = (record: any): [number, number] | null => {
  const lat = Number.parseFloat(record.latitude || record.lat || record.LATITUDE);
  const lng = Number.parseFloat(record.longitude || record.lon || record.lng || record.LONGITUDE);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
};

export async function fetchVicRoadsHazards() {
  if (!config.vicroadsApiUrl) return [];

  const headers = config.vicroadsApiKey
    ? {
        'Ocp-Apim-Subscription-Key': config.vicroadsApiKey,
        KeyID: config.vicroadsApiKey
      }
    : {};

  const url = new URL(config.vicroadsApiUrl);
  if (config.vicroadsApiKey && !url.searchParams.has('subscription-key')) {
    url.searchParams.set('subscription-key', config.vicroadsApiKey);
  }

  const payload: any = await fetchJson(url.toString(), { headers });
  const records = payload?.result?.records || payload?.records || [];

  return records
    .map((record: any, index: number) => {
      const title = record.event_type || record.description || record.title || 'Road disruption';
      const type = inferType(`${record.event_type || ''} ${record.subcategory || ''} ${title}`);
      const coords = toCoords(record);

      if (!coords) return null;

      return sanitizeHazard({
        id: `vicroads-${record.id || record._id || index}`,
        type,
        severity: toSeverity(record.severity || record.risk || record.impact),
        title,
        riskCategory: record.event_type || record.subcategory || 'Road disruption',
        description: record.description || record.details || 'Unplanned road disruption',
        source: 'DataVic',
        sourceUrl: 'https://www.data.vic.gov.au/',
        updatedAt: record.updated_at || record.last_updated || new Date().toISOString(),
        coordinates: coords
      });
    })
    .filter(Boolean);
}
