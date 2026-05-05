import { reactive } from 'vue'
import type { PlanRouteResponse } from 'hikeshield-shared'

const STORAGE_KEY = 'gohiking_route_plan_v1'

const state = reactive<{ latestPlan: PlanRouteResponse | null }>({
  latestPlan: null,
})

export function setLatestRoutePlan(payload: PlanRouteResponse | null): void {
  state.latestPlan = payload || null
  if (payload) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

export function restoreLatestRoutePlan(): PlanRouteResponse | null {
  if (state.latestPlan) return state.latestPlan
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    state.latestPlan = JSON.parse(raw) as PlanRouteResponse
  } catch {
    state.latestPlan = null
    sessionStorage.removeItem(STORAGE_KEY)
  }
  return state.latestPlan
}

export function useRoutePlanState() {
  return state
}
