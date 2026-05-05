import type {
  Coordinate,
  PlanRouteResponse,
  RoutePayload,
  RouteOption,
  RoutePlanHistoryResponse,
  DeleteRoutePlanHistoryResponse,
  ClearRoutePlanHistoryResponse,
  ScoringBreakdown,
} from 'hikeshield-shared'

const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'
const PLAN_SESSION_KEY = 'hikeshield_plan_session_id'

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sid-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getOrCreatePlanSessionId(): string {
  const stored = localStorage.getItem(PLAN_SESSION_KEY)
  if (stored) return stored
  const created = randomId()
  localStorage.setItem(PLAN_SESSION_KEY, created)
  return created
}

// ── The shared RoutePayload type already defines every field.
//    The runtime normalisation here supplies defaults for resilience
//    against partial server responses, but no longer needs to
//    defensively list every field — the type is the contract. ─────

function normalizeRoute(route: RoutePayload | null | undefined): RoutePayload {
  const safetyStatus =
    route?.safetyStatus || (route?.goNoGo === 'No-Go' ? 'Dangerous' : 'Safe')
  return {
    id: route?.id || '',
    geometry: Array.isArray(route?.geometry) ? route.geometry : [],
    distanceKm: Number(route?.distanceKm || 0),
    durationMin: Number(route?.durationMin || 0),
    difficulty: route?.difficulty || 'Easy',
    riskScore: Number(route?.riskScore || 0),
    riskLevel: route?.riskLevel || 'Low',
    goNoGo: route?.goNoGo || (safetyStatus === 'Dangerous' ? 'No-Go' : 'Go'),
    safetyStatus,
    intro: route?.intro || '',
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
    noGoReasons: route?.noGoReasons || {
      hasExtremeTooClose: false,
      hasHighTooClose: false,
      hasFireTooClose: false,
      exceedsDistanceCap: false,
      exceedsDurationCap: false,
      hasRouteClosure: false,
      hasSevereCliffExposure: false,
      hasSteepTerrainForUser: false,
      exceedsScoreThreshold: false,
    },
    scoringBreakdown: route?.scoringBreakdown || {
      baseRisk: 0,
      hazardExposure: 0,
      diversityBoost: 0,
      routeEffort: 0,
      burdenScore: 0,
      elevationFatigue: 0,
      terrainDanger: 0,
      zoneCoverage: 0,
      terrainSurface: 0,
      exposureCounts: 0,
      envMultiplier: 0,
      sunAdjust: 0,
      seasonAdjust: 0,
      tempAdjust: 0,
      sunsetHour: 0,
      finishHour: 0,
      interactionPenalty: 0,
      baseWeightedTotal: 0,
      profileFactor: 0,
      weightedTotal: 0,
      noGoFloorScore: 0,
    },
  }
}

export interface PlanSafeRouteParams {
  start: Coordinate
  end: Coordinate
  token?: string
  signal?: AbortSignal
}

export async function planSafeRoute({ start, end, token, signal }: PlanSafeRouteParams): Promise<PlanRouteResponse> {
  const sessionId = getOrCreatePlanSessionId()
  let response: Response
  try {
    response = await fetch(`${DEFAULT_BASE_URL}/routes/plan`, {
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
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('The route service connection was interrupted. Please try Plan Safe Route again in a moment.')
  }

  const payload = await response.json().catch(() => ({})) as Partial<PlanRouteResponse & { error?: string }>
  if (!response.ok) {
    const message = payload?.error || `Route planning failed (${response.status})`
    if (message.includes('too far apart')) {
      throw new Error('Start and destination are too far apart for a hiking route. Choose two closer points, ideally on the same trail area or within 80 km.')
    }
    if (message.includes('OpenRouteService')) {
      throw new Error('No routable trail or road route was found for those two points. Move both points closer to a mapped road or walking track, then try again.')
    }
    throw new Error(message)
  }

  return {
    userLevel: payload?.userLevel || 'newcomer',
    recommendedRoute: normalizeRoute(payload?.recommendedRoute),
    alternatives: Array.isArray(payload?.alternatives) ? payload.alternatives.map((a) => normalizeRoute(a)) : [],
    routeOptions: Array.isArray(payload?.routeOptions)
      ? payload.routeOptions.map((o) => ({ ...normalizeRoute(o), targetDifficulty: (o as RouteOption).targetDifficulty || '' }))
      : [],
    scoringBreakdown: payload?.scoringBreakdown || {} as ScoringBreakdown,
  }
}

// ── History ──────────────────────────────────────────────────────

export interface FetchRoutePlanHistoryParams {
  token?: string
  limit?: number
  signal?: AbortSignal
}

interface HistoryItemRaw {
  id?: string
  createdAt?: string
  start?: Coordinate | null
  end?: Coordinate | null
  planPayload?: Partial<PlanRouteResponse>
}

export async function fetchRoutePlanHistory(
  { token, limit = 20, signal }: FetchRoutePlanHistoryParams = {}
): Promise<RoutePlanHistoryResponse> {
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

  const payload = await response.json().catch(() => ({})) as Partial<RoutePlanHistoryResponse & { error?: string }>
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to fetch route history (${response.status})`)
  }

  return {
    history: Array.isArray(payload?.history)
      ? payload.history.map((item: HistoryItemRaw) => {
          const planPayload = item?.planPayload || {}
          return {
            id: item?.id || '',
            createdAt: item?.createdAt || '',
            start: item?.start || null,
            end: item?.end || null,
            planPayload: {
              userLevel: planPayload?.userLevel || 'newcomer',
              recommendedRoute: normalizeRoute(planPayload?.recommendedRoute),
              alternatives: Array.isArray(planPayload?.alternatives) ? planPayload.alternatives.map((a) => normalizeRoute(a)) : [],
              routeOptions: Array.isArray(planPayload?.routeOptions)
                ? planPayload.routeOptions.map((o) => ({ ...normalizeRoute(o), targetDifficulty: (o as RouteOption).targetDifficulty || '' }))
                : [],
              scoringBreakdown: planPayload?.scoringBreakdown || {} as ScoringBreakdown,
            },
          }
        })
      : [],
  }
}

export interface DeleteRoutePlanHistoryItemParams {
  id: string
  token?: string
  signal?: AbortSignal
}

export async function deleteRoutePlanHistoryItem(
  { id, token, signal }: DeleteRoutePlanHistoryItemParams = { id: '' }
): Promise<DeleteRoutePlanHistoryResponse> {
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
  const payload = await response.json().catch(() => ({})) as Partial<DeleteRoutePlanHistoryResponse & { error?: string }>
  if (response.status === 404) {
    return { ok: true, deleted: false }
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to delete route history item (${response.status})`)
  }
  return { ok: true, deleted: payload?.deleted !== false }
}

export interface ClearRoutePlanHistoryParams {
  token?: string
  signal?: AbortSignal
}

export async function clearRoutePlanHistory(
  { token, signal }: ClearRoutePlanHistoryParams = {}
): Promise<ClearRoutePlanHistoryResponse> {
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
  const payload = await response.json().catch(() => ({})) as Partial<ClearRoutePlanHistoryResponse & { error?: string }>
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to clear route history (${response.status})`)
  }
  return {
    ok: true,
    deletedCount: Number(payload?.deletedCount || 0),
  }
}
