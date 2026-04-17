const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'

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
  const response = await fetch(`${DEFAULT_BASE_URL}/routes/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
