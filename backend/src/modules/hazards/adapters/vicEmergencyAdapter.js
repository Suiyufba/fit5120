import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { fetchText } from '../../../shared/http/fetchText.js';
import { inferType, sanitizeHazard, toSeverity } from '../domain/hazardUtils.js';

const rssTag = (block, tagName) => {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
};

const htmlField = (description, fieldName) => {
  const escapedLabel = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedLabel}:&lt;\\/strong&gt;\\s*([^<]+)`, 'i');
  const match = description.match(regex);
  return match ? match[1].trim() : '';
};

function parseVicEmergencyRss(xmlText) {
  const itemBlocks = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return itemBlocks
    .map((block, index) => {
      const title = rssTag(block, 'title') || 'VicEmergency event';
      const link = rssTag(block, 'link') || 'https://emergency.vic.gov.au/';
      const description = rssTag(block, 'description');
      const updatedAt = rssTag(block, 'dc:date') || rssTag(block, 'pubDate') || new Date().toISOString();

      const latitude = Number.parseFloat(htmlField(description, 'Latitude'));
      const longitude = Number.parseFloat(htmlField(description, 'Longitude'));
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

      const incidentType = htmlField(description, 'Type');
      const incidentStatus = htmlField(description, 'Status');
      const incidentNo = htmlField(description, 'Incident No');
      const incidentName = htmlField(description, 'Incident Name');
      const incidentLocation = htmlField(description, 'Location');

      return sanitizeHazard({
        id: `vicem-rss-${incidentNo || index}`,
        type: inferType(`${incidentType} ${title}`),
        severity: toSeverity(incidentStatus || incidentType || 'moderate'),
        title,
        description: `${incidentType || 'Incident'} · ${incidentStatus || 'Status unknown'} · ${incidentLocation || 'Victoria'}`,
        source: 'VicEmergency',
        sourceUrl: link,
        updatedAt,
        coordinates: [latitude, longitude],
        metadata: {
          incidentNo,
          incidentName
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
  } catch (_jsonError) {
    const xml = await fetchText(config.vicEmergencyFeedUrl, { headers });
    return parseVicEmergencyRss(xml);
  }
}
