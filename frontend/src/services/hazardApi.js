import { readJsonCache, writeJsonCache } from './localCache'

const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'
const REALTIME_HAZARD_PATH = '/hazards/realtime'
const DISPLAY_SOURCE_FALLBACK = 'Victorian Safety Snapshot'
const HAZARD_CACHE_PREFIX = 'hikeshield_cache_hazards:'

function normalizeSource(rawSource) {
  const source = (rawSource || '').toString().trim()
  if (!source) return DISPLAY_SOURCE_FALLBACK
  if (source.toLowerCase() === 'fallback') return DISPLAY_SOURCE_FALLBACK
  return source
}

function normalizeType(rawType) {
  const value = (rawType || '').toString().toLowerCase()
  if (value.includes('fire')) return 'fire'
  if (value.includes('flood')) return 'flood'
  if (value.includes('storm') || value.includes('rain') || value.includes('wind')) return 'storm'
  if (value.includes('heat') || value.includes('temperature')) return 'heat'
  if (value.includes('trail') || value.includes('track') || value.includes('obstacle') || value.includes('fall') || value.includes('tree')) return 'trail'
  return 'other'
}

function normalizeSeverity(rawSeverity) {
  const value = (rawSeverity || '').toString().toLowerCase()
  if (['extreme', 'severe', 'emergency'].includes(value)) return 'extreme'
  if (['high', 'watch-and-act', 'warning'].includes(value)) return 'high'
  if (['moderate', 'advice'].includes(value)) return 'moderate'
  return 'low'
}

function normalizeFeature(feature) {
  if (!feature || feature.type !== 'Feature') return null

  const [lng, lat] = feature.geometry?.coordinates || []
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const props = feature.properties || {}
  return {
    id: props.id || feature.id || `${lat}-${lng}-${Date.now()}`,
    title: props.title || props.event || 'Unnamed hazard',
    riskCategory: props.riskCategory || props.category || props.incidentType || '',
    description: props.description || props.headline || 'No detail provided',
    source: normalizeSource(props.source || props.provider || 'Official open data'),
    sourceUrl: props.sourceUrl || props.link || '',
    updatedAt: props.updatedAt || props.updated || props.published || null,
    type: normalizeType(props.type || props.category || props.hazardType),
    severity: normalizeSeverity(props.severity || props.level || props.warningLevel),
    coordinates: [lat, lng],
  }
}

function normalizeRecord(record) {
  if (!record || !Array.isArray(record.coordinates) || record.coordinates.length !== 2) return null

  const [lat, lng] = record.coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  return {
    id: record.id || `${lat}-${lng}-${Date.now()}`,
    title: record.title || 'Unnamed hazard',
    riskCategory: record.riskCategory || record.category || record.incidentType || '',
    description: record.description || 'No detail provided',
    source: normalizeSource(record.source || 'Official open data'),
    sourceUrl: record.sourceUrl || '',
    updatedAt: record.updatedAt || null,
    type: normalizeType(record.type),
    severity: normalizeSeverity(record.severity),
    coordinates: [lat, lng],
  }
}

function normalizePayload(payload) {
  if (payload?.type === 'FeatureCollection' && Array.isArray(payload.features)) {
    return payload.features.map(normalizeFeature).filter(Boolean)
  }

  if (Array.isArray(payload?.hazards)) {
    return payload.hazards.map(normalizeRecord).filter(Boolean)
  }

  return []
}

function normalizeFetchedAt(rawFetchedAt) {
  const timestamp = Date.parse(rawFetchedAt || '')
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp)
}

export function getHazardApiConfig() {
  return {
    baseUrl: DEFAULT_BASE_URL,
    realtimeEndpoint: `${DEFAULT_BASE_URL}${REALTIME_HAZARD_PATH}`,
  }
}

function buildRealtimeHazardCacheKey({ bbox, layers } = {}) {
  const normalizedBbox = Array.isArray(bbox) && bbox.length === 4 ? bbox.map((value) => Number(value).toFixed(4)).join(',') : 'all'
  const normalizedLayers = Array.isArray(layers) && layers.length ? [...layers].sort().join(',') : 'all'
  return `${HAZARD_CACHE_PREFIX}bbox=${normalizedBbox}|layers=${normalizedLayers}`
}

function serializeHazardPayload(payload) {
  return {
    hazards: Array.isArray(payload?.hazards) ? payload.hazards : [],
    fetchedAt: payload?.fetchedAt instanceof Date ? payload.fetchedAt.toISOString() : null,
    isStale: Boolean(payload?.isStale),
  }
}

function deserializeHazardPayload(rawPayload) {
  if (!rawPayload || !Array.isArray(rawPayload.hazards)) return null
  return {
    hazards: normalizePayload({ hazards: rawPayload.hazards }),
    fetchedAt: normalizeFetchedAt(rawPayload.fetchedAt),
    isStale: Boolean(rawPayload.isStale),
  }
}

async function requestRealtimeHazards({ bbox, layers, signal } = {}) {
  const params = new URLSearchParams()
  if (bbox?.length === 4) params.set('bbox', bbox.join(','))
  if (layers?.length) params.set('layers', layers.join(','))

  const { realtimeEndpoint } = getHazardApiConfig()
  const url = params.size ? `${realtimeEndpoint}?${params.toString()}` : realtimeEndpoint

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Realtime hazard API failed with status ${response.status}`)
  }

  const payload = await response.json()
  return {
    hazards: normalizePayload(payload),
    fetchedAt: normalizeFetchedAt(payload?.fetchedAt),
    isStale: Boolean(payload?.isStale),
  }
}

export async function fetchRealtimeHazards({ bbox, layers, signal, preferCache = false, onUpdate } = {}) {
  const cacheKey = buildRealtimeHazardCacheKey({ bbox, layers })
  const cached = preferCache ? readJsonCache(cacheKey) : null
  const cachedPayload = deserializeHazardPayload(cached?.data)

  const fetchAndRefresh = async () => {
    const freshPayload = await requestRealtimeHazards({ bbox, layers, signal })
    writeJsonCache(cacheKey, serializeHazardPayload(freshPayload))
    if (typeof onUpdate === 'function') onUpdate({ ...freshPayload, cachedAt: new Date() })
    return freshPayload
  }

  if (cachedPayload) {
    void fetchAndRefresh().catch((error) => {
      if (error?.name === 'AbortError') return
      console.error('Realtime hazards background refresh failed:', error)
    })
    return { ...cachedPayload, cachedAt: cached.cachedAt, isFromCache: true }
  }

  return fetchAndRefresh()
}
