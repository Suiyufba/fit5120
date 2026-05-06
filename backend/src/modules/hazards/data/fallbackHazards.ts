// @ts-nocheck
export const fallbackHazards = [
  {
    id: 'fallback-fire-1',
    type: 'fire',
    severity: 'high',
    title: 'Smoke near Apollo Bay',
    description: 'Temporary official safety snapshot while live provider sync is recovering.',
    source: 'Victorian Safety Snapshot',
    sourceUrl: 'https://emergency.vic.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-38.754, 143.669]
  },
  {
    id: 'fallback-flood-1',
    type: 'flood',
    severity: 'moderate',
    title: 'Flood watch in Gippsland',
    description: 'Potential inundation risk reported in low-lying roads.',
    source: 'Victorian Safety Snapshot',
    sourceUrl: 'https://emergency.vic.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-38.11, 147.07]
  },
  {
    id: 'fallback-storm-1',
    type: 'storm',
    severity: 'moderate',
    title: 'Strong wind warning in Melbourne',
    description: 'Wind gusts expected in metro areas.',
    source: 'Victorian Safety Snapshot',
    sourceUrl: 'https://emergency.vic.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-37.8136, 144.9631]
  },
  {
    id: 'fallback-heat-1',
    type: 'heat',
    severity: 'high',
    title: 'Heat alert in northwest Victoria',
    description: 'High daytime temperatures forecast over multiple days.',
    source: 'Victorian Safety Snapshot',
    sourceUrl: 'https://emergency.vic.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-35.337, 143.55]
  }
];
