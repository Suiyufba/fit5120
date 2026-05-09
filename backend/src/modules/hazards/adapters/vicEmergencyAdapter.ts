import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { fetchText } from '../../../shared/http/fetchText.js';
import { inferType, sanitizeHazard, toSeverity } from '../domain/hazardUtils.js';

const rssTag = (block: string, tagName: string): string => {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
};

const decodeHtml = (value = '') =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const toPlainText = (value = ''): string =>
  decodeHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const extractFields = (rawDescription) => {
  const plain = toPlainText(rawDescription);
  const lines = plain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const fields = {};
  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length < 2) continue;
    const key = parts.shift().trim().toLowerCase();
    const value = parts.join(':').trim();
    if (!key || !value) continue;
    fields[key] = value;
  }

  return {
    plain,
    fields,
    get(fieldName) {
      return fields[fieldName.toLowerCase()] || '';
    }
  };
};

function parseVicEmergencyRss(xmlText) {
  const itemBlocks = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return itemBlocks
    .map((block, index) => {
      const title = rssTag(block, 'title') || 'VicEmergency event';
      const link = rssTag(block, 'link') || 'https://emergency.vic.gov.au/';
      const description = rssTag(block, 'description');
      const updatedAt = rssTag(block, 'dc:date') || rssTag(block, 'pubDate') || new Date().toISOString();
      const parsed = extractFields(description);

      const latitude = Number.parseFloat(parsed.get('Latitude'));
      const longitude = Number.parseFloat(parsed.get('Longitude'));
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

      const incidentType = parsed.get('Type');
      const incidentStatus = parsed.get('Status');
      const incidentNo = parsed.get('Incident No');
      const incidentName = parsed.get('Incident Name');
      const incidentLocation = parsed.get('Location');
      const incidentSize = parsed.get('Size');

      return sanitizeHazard({
        id: `vicem-rss-${incidentNo || index}`,
        type: inferType(`${incidentType} ${title}`),
        severity: toSeverity(incidentStatus || incidentType || 'moderate'),
        title: decodeHtml(title).replace(/\s+/g, ' ').trim(),
        riskCategory: incidentType || 'Incident',
        description: [
          `${incidentType || 'Incident'} at ${incidentLocation || 'Victoria'}`,
          incidentStatus ? `Status: ${incidentStatus}` : '',
          incidentSize ? `Size: ${incidentSize}` : ''
        ]
          .filter(Boolean)
          .join(' · '),
        source: 'VicEmergency',
        sourceUrl: link,
        updatedAt,
        coordinates: [latitude, longitude],
        metadata: {
          incidentNo,
          incidentName,
          rawSummary: parsed.plain
        }
      });
    })
    .filter(Boolean);
}

export async function fetchVicEmergencyHazards() {
  if (!config.vicEmergencyFeedUrl) return [];

  const headers = config.vicEmergencyApiKey
    ? { Authorization: `Bearer ${config.vicEmergencyApiKey}` }
    : {};

  try {
    const payload: any = await fetchJson(config.vicEmergencyFeedUrl, { headers });
    const items = payload?.hazards || payload?.events || payload?.features || [];

    return items
      .map((item: any, index: number) => {
        const point = item.coordinates || item?.geometry?.coordinates;
        if (!Array.isArray(point) || point.length < 2) return null;

        const maybeLngLat = Math.abs(point[0]) <= 90 && Math.abs(point[1]) > 90 ? [point[1], point[0]] : point;
        const normalized = [maybeLngLat[1], maybeLngLat[0]];

        const title = item.title || item.name || 'VicEmergency event';
        const incidentType = item.type || item.category || item.subcategory || '';
        return sanitizeHazard({
          id: `vicem-${item.id || index}`,
          type: item.type || inferType(`${title} ${item.category || ''}`),
          severity: toSeverity(item.severity || item.level),
          title,
          riskCategory: incidentType || 'Incident',
          description: item.description || item.summary || '',
          source: 'VicEmergency',
          sourceUrl: item.sourceUrl || 'https://emergency.vic.gov.au/',
          updatedAt: item.updatedAt || item.updated || new Date().toISOString(),
          coordinates: normalized
        });
      })
      .filter(Boolean);
  } catch (_jsonError) {
    const xml: string = await fetchText(config.vicEmergencyFeedUrl, { headers }) as string;
    return parseVicEmergencyRss(xml);
  }
}
