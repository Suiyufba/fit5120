import { readJsonCache, removeJsonCacheByPrefix, writeJsonCache } from './localCache'

const ENV_BASE_URL = (
  import.meta.env.VITE_HAZARD_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ''
).trim()
const LEGACY_BASE_URL = 'https://backend-production-f55c.up.railway.app/api'
const COMMUNITY_REPORTS_CACHE_PREFIX = 'hikeshield_cache_community_reports:'

function buildCandidateBaseUrls() {
  const candidates = [ENV_BASE_URL, LEGACY_BASE_URL, '/api']
  const uniq: string[] = []

  candidates.forEach((value) => {
    const next = String(value || '').trim().replace(/\/+$/, '')
    if (!next || uniq.includes(next)) return
    uniq.push(next)
  })

  return uniq
}

async function parseJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestWithFallback(path: string, options: Record<string, unknown> = {}, { signal }: { signal?: AbortSignal } = {}) {
  const bases = buildCandidateBaseUrls()
  let lastError

  for (const baseUrl of bases) {
    try {
      const response = await fetch(baseUrl + path, {
        ...options,
        credentials: 'include',
        signal,
      })

      // Only fall through to the next candidate base URL when the current one
      // clearly cannot serve the route (404 or 405 from a static/frontend host).
      // All other responses (including 4xx validation errors from the real
      // backend) must surface to the caller so the error message is preserved.
      if (response.status === 404 || response.status === 405) {
        lastError = new Error('Community reports request failed (' + response.status + ')')
        continue
      }

      return response
    } catch (error) {
      if ((error as any)?.name === 'AbortError') throw error
      lastError = error
    }
  }

  throw lastError || new Error('Community reports request failed')
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeReport(raw: Record<string, unknown> = {}) {
  return {
    id: String(raw.id || ''),
    title: String(raw.title || 'Untitled report'),
    description: String(raw.description || 'No detail provided'),
    hazardType: String(raw.hazardType || 'other').toLowerCase(),
    severity: String(raw.severity || 'low').toLowerCase(),
    locationName: String(raw.locationName || 'Unknown location'),
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    imageUrl: String(raw.imageUrl || ''),
    reporterName: String(raw.reporterName || 'Anonymous Hiker'),
    likes: toNumber(raw.likes),
    views: toNumber(raw.views),
    reportedAt: raw.reportedAt ? new Date(raw.reportedAt as string) : new Date(),
  }
}

function buildCommunityReportsCacheKey({ limit = 50 }: { limit?: number } = {}) {
  return `${COMMUNITY_REPORTS_CACHE_PREFIX}limit=${Number(limit) || 50}`
}

function serializeCommunityReportsPayload(payload: Record<string, unknown>) {
  return {
    reports: Array.isArray(payload?.reports)
      ? payload.reports.map((report) => ({
        ...report,
        reportedAt: report?.reportedAt instanceof Date ? report.reportedAt.toISOString() : report?.reportedAt || null,
      }))
      : [],
    storage: payload?.storage || 'unknown',
    fetchedAt: payload?.fetchedAt instanceof Date ? payload.fetchedAt.toISOString() : null,
  }
}

function deserializeCommunityReportsPayload(rawPayload: Record<string, unknown>) {
  if (!rawPayload || !Array.isArray(rawPayload.reports)) return null
  return {
    reports: rawPayload.reports.map(normalizeReport),
    storage: rawPayload.storage || 'unknown',
    fetchedAt: rawPayload.fetchedAt ? new Date(rawPayload.fetchedAt as string) : new Date(),
  }
}

async function requestCommunityReports({ limit = 50, signal }: { limit?: number; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })

  const response = await requestWithFallback('/community-reports?' + params.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, { signal })
  const payload = await parseJson(response)

  if (!response.ok) {
    throw new Error(payload?.error || 'Community reports request failed (' + response.status + ')')
  }

  if (!Array.isArray(payload?.reports)) {
    throw new Error('Community reports request failed (invalid response)')
  }

  return {
    reports: payload.reports.map(normalizeReport),
    storage: payload?.storage || 'unknown',
    fetchedAt: payload?.fetchedAt ? new Date(payload.fetchedAt as string) : new Date(),
  }
}

export async function fetchCommunityReports({ limit = 50, signal, preferCache = false, onUpdate }: { limit?: number; signal?: AbortSignal; preferCache?: boolean; onUpdate?: (p: any) => void } = {}) {
  const cacheKey = buildCommunityReportsCacheKey({ limit })
  const cached = preferCache ? readJsonCache(cacheKey) : null
  const cachedPayload = deserializeCommunityReportsPayload(cached?.data || null)

  const fetchAndRefresh = async () => {
    const freshPayload = await requestCommunityReports({ limit, signal })
    writeJsonCache(cacheKey, serializeCommunityReportsPayload(freshPayload))
    if (typeof onUpdate === 'function') onUpdate({ ...freshPayload, cachedAt: new Date() })
    return freshPayload
  }

  if (cachedPayload) {
    void fetchAndRefresh().catch((error) => {
      if (error?.name === 'AbortError') return
      console.error('Community reports background refresh failed:', error)
    })
    return { ...cachedPayload!, cachedAt: cached!.cachedAt, isFromCache: true }
  }

  return fetchAndRefresh()
}

export async function submitCommunityReport(input: Record<string, unknown>, { signal }: { signal?: AbortSignal } = {}) {
  const response = await requestWithFallback('/community-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(input?.token ? { Authorization: `Bearer ${input.token}` } : {}),
    },
    body: JSON.stringify({
      title: input?.title,
      description: input?.description,
      locationName: input?.locationName,
      hazardType: input?.hazardType,
      severity: input?.severity,
      latitude: input?.latitude,
      longitude: input?.longitude,
      reporterName: input?.reporterName,
      imageUrl: input?.imageUrl,
    }),
  }, { signal })
  const payload = await parseJson(response)

  if (!response.ok) {
    throw new Error(payload?.error || 'Submit report failed (' + response.status + ')')
  }

  if (!payload?.report || !payload?.report?.id) {
    throw new Error('Submit report failed (invalid response)')
  }

  invalidateCommunityReportsCache()
  return {
    report: normalizeReport(payload?.report || {}),
    storage: payload?.storage || 'unknown',
  }
}

export function invalidateCommunityReportsCache() {
  removeJsonCacheByPrefix(COMMUNITY_REPORTS_CACHE_PREFIX)
}

export async function uploadCommunityReportImage({ dataUrl, width, height, signal }: { dataUrl?: string; width?: number; height?: number; signal?: AbortSignal } = {}) {
  if (!dataUrl) throw new Error('dataUrl is required')

  const response = await requestWithFallback('/community-reports/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      dataUrl,
      width: Number.isFinite(width) ? Math.round(width!) : undefined,
      height: Number.isFinite(height) ? Math.round(height!) : undefined,
    }),
  }, { signal })

  const payload = await parseJson(response)

  if (!response.ok) {
    throw new Error(payload?.error || 'Image upload failed (' + response.status + ')')
  }

  if (!payload?.url || !payload?.id) {
    throw new Error('Image upload failed (invalid response)')
  }

  return {
    id: String(payload.id),
    url: String(payload.url),
    byteSize: Number(payload.byteSize) || 0,
    storage: payload?.storage || 'unknown',
  }
}
