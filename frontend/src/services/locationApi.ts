// @ts-nocheck
const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'

function normalizeLocation(item) {
  return {
    displayName: String(item?.displayName || '').trim() || 'Unnamed location',
    lat: Number(item?.lat || 0),
    lng: Number(item?.lng || 0),
  }
}

export async function searchLocations(query, { signal, limit = 6 } = {}) {
  const text = String(query || '').trim()
  if (text.length < 2) return []

  const params = new URLSearchParams({
    q: text,
    limit: String(limit),
  })
  const response = await fetch(`${DEFAULT_BASE_URL}/locations/search?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Location search failed (${response.status})`)
  }
  return Array.isArray(payload?.results) ? payload.results.map(normalizeLocation) : []
}

export async function reverseLocation(lat, lng, { signal } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  })
  const response = await fetch(`${DEFAULT_BASE_URL}/locations/reverse?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Reverse location failed (${response.status})`)
  }
  return payload?.result ? normalizeLocation(payload.result) : null
}
