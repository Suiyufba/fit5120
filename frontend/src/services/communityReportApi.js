const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'

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
  const url = DEFAULT_BASE_URL + '/community-reports?' + params.toString()
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Community reports request failed (' + response.status + ')')
  }

  const reports = Array.isArray(payload?.reports) ? payload.reports.map(normalizeReport) : []
  return {
    reports,
    storage: payload?.storage || 'unknown',
    fetchedAt: payload?.fetchedAt ? new Date(payload.fetchedAt) : new Date(),
  }
}

export async function submitCommunityReport(input, { signal } = {}) {
  const response = await fetch(DEFAULT_BASE_URL + '/community-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(input || {}),
    signal,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Submit report failed (' + response.status + ')')
  }

  return {
    report: normalizeReport(payload?.report || {}),
    storage: payload?.storage || 'unknown',
  }
}
