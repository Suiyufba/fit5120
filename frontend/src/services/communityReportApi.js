const ENV_BASE_URL = (import.meta.env.VITE_HAZARD_API_BASE_URL || '').trim()
const LEGACY_BASE_URL = 'https://backend-production-f55c.up.railway.app/api'

function buildCandidateBaseUrls() {
  const candidates = [ENV_BASE_URL, LEGACY_BASE_URL, '/api']
  const uniq = []

  candidates.forEach((value) => {
    const next = String(value || '').trim().replace(/\/+$/, '')
    if (!next || uniq.includes(next)) return
    uniq.push(next)
  })

  return uniq
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestWithFallback(path, options = {}, { signal } = {}) {
  const bases = buildCandidateBaseUrls()
  let lastError

  for (const baseUrl of bases) {
    try {
      const response = await fetch(baseUrl + path, {
        ...options,
        signal,
      })

      if (response.status === 404) {
        lastError = new Error('Community reports request failed (404)')
        continue
      }

      return response
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      lastError = error
    }
  }

  throw lastError || new Error('Community reports request failed')
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeReport(raw = {}) {
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
    reportedAt: raw.reportedAt ? new Date(raw.reportedAt) : new Date(),
  }
}

export async function fetchCommunityReports({ limit = 50, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  const bases = buildCandidateBaseUrls()
  let lastError

  for (const baseUrl of bases) {
    try {
      const response = await requestWithFallback('/community-reports?' + params.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }, { signal })
      const payload = await parseJson(response)

      if (!response.ok) {
        lastError = new Error(payload?.error || 'Community reports request failed (' + response.status + ')')
        continue
      }

      if (!Array.isArray(payload?.reports)) {
        lastError = new Error('Community reports request failed (invalid response)')
        continue
      }

      const reports = payload.reports.map(normalizeReport)
      return {
        reports,
        storage: payload?.storage || 'unknown',
        fetchedAt: payload?.fetchedAt ? new Date(payload.fetchedAt) : new Date(),
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      lastError = error
    }
  }

  throw lastError || new Error('Community reports request failed')
}

export async function submitCommunityReport(input, { signal } = {}) {
  const bases = buildCandidateBaseUrls()
  let lastError

  for (const baseUrl of bases) {
    try {
      const response = await fetch(baseUrl + '/community-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(input || {}),
        signal,
      })
      const payload = await parseJson(response)

      if (!response.ok) {
        lastError = new Error(payload?.error || 'Submit report failed (' + response.status + ')')
        continue
      }

      if (!payload?.report || !payload?.report?.id) {
        lastError = new Error('Submit report failed (invalid response)')
        continue
      }

      return {
        report: normalizeReport(payload?.report || {}),
        storage: payload?.storage || 'unknown',
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      lastError = error
    }
  }

  throw lastError || new Error('Submit report failed')
}
