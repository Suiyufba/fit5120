const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'
const PLAN_SESSION_KEY = 'hikeshield_plan_session_id'

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sid-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getOrCreatePlanSessionId() {
  const stored = localStorage.getItem(PLAN_SESSION_KEY)
  if (stored) return stored
  const created = randomId()
  localStorage.setItem(PLAN_SESSION_KEY, created)
  return created
}

function normalizeRoute(route) {
  return {
    id: route?.id || '',
    geometry: Array.isArray(route?.geometry) ? route.geometry : [],
    distanceKm: Number(route?.distanceKm || 0),
    durationMin: Number(route?.durationMin || 0),
    difficulty: route?.difficulty || 'Easy',
    riskScore: Number(route?.riskScore || 0),
    riskLevel: route?.riskLevel || 'Low',
    goNoGo: route?.goNoGo || 'Go',
    intro: route?.intro || '',
    introSource: route?.introSource || '',
    introModel: route?.introModel || '',
    explanation: route?.explanation || '',
    keyRisks: Array.isArray(route?.keyRisks) ? route.keyRisks : [],
    geographyProfile: route?.geographyProfile || {
      totalAscentM: 0,
      totalDescentM: 0,
      maxSlopePct: 0,
      avgSlopePct: 0,
      terrainType: 'mixed',
      surfaceType: 'unknown',
      trailCondition: 'unknown',
      riverCrossingCount: 0,
      cliffExposureCount: 0,
      closureCount: 0,
    },
    zoneSummary: route?.zoneSummary || { level1Count: 0, level2Count: 0, level3Count: 0 },
    suggestedPrep: Array.isArray(route?.suggestedPrep) ? route.suggestedPrep : [],
  }
}

function normalizeAlternative(alt) {
  return normalizeRoute(alt)
}

function normalizeRouteOption(option) {
  return {
    targetDifficulty: option?.targetDifficulty || '',
    ...normalizeRoute(option),
  }
}

export async function planSafeRoute({ start, end, token, signal }) {
  const sessionId = getOrCreatePlanSessionId()
  const response = await fetch(`${DEFAULT_BASE_URL}/routes/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Plan-Session-Id': sessionId,
    },
    body: JSON.stringify({ start, end }),
    signal,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Route planning failed (${response.status})`)
  }

  return {
    userLevel: payload?.userLevel || 'newcomer',
    recommendedRoute: normalizeRoute(payload?.recommendedRoute),
    alternatives: Array.isArray(payload?.alternatives) ? payload.alternatives.map(normalizeAlternative) : [],
    routeOptions: Array.isArray(payload?.routeOptions) ? payload.routeOptions.map(normalizeRouteOption) : [],
    scoringBreakdown: payload?.scoringBreakdown || {},
  }
}

function normalizeHistoryItem(item) {
  const planPayload = item?.planPayload || {}
  return {
    id: item?.id || '',
    createdAt: item?.createdAt || '',
    start: item?.start || null,
    end: item?.end || null,
    planPayload: {
      userLevel: planPayload?.userLevel || 'newcomer',
      recommendedRoute: normalizeRoute(planPayload?.recommendedRoute),
      alternatives: Array.isArray(planPayload?.alternatives) ? planPayload.alternatives.map(normalizeAlternative) : [],
      routeOptions: Array.isArray(planPayload?.routeOptions) ? planPayload.routeOptions.map(normalizeRouteOption) : [],
      scoringBreakdown: planPayload?.scoringBreakdown || {},
    },
  }
}

export async function fetchRoutePlanHistory({ token, limit = 20, signal } = {}) {
  const sessionId = getOrCreatePlanSessionId()
  const url = new URL(`${DEFAULT_BASE_URL}/routes/history`)
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Plan-Session-Id': sessionId,
    },
    signal,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to fetch route history (${response.status})`)
  }

  return {
    history: Array.isArray(payload?.history) ? payload.history.map(normalizeHistoryItem) : [],
  }
}

export async function deleteRoutePlanHistoryItem({ id, token, signal } = {}) {
  const sessionId = getOrCreatePlanSessionId()
  const response = await fetch(`${DEFAULT_BASE_URL}/routes/history/${encodeURIComponent(String(id || ''))}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Plan-Session-Id': sessionId,
    },
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 404) {
    return { ok: true, deleted: false }
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to delete route history item (${response.status})`)
  }
  return { ok: true, deleted: payload?.deleted !== false }
}

export async function clearRoutePlanHistory({ token, signal } = {}) {
  const sessionId = getOrCreatePlanSessionId()
  const response = await fetch(`${DEFAULT_BASE_URL}/routes/history`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Plan-Session-Id': sessionId,
    },
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to clear route history (${response.status})`)
  }
  return {
    ok: true,
    deletedCount: Number(payload?.deletedCount || 0),
  }
}
