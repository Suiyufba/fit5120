import { reactive } from 'vue'

const STORAGE_KEY = 'gohiking_route_plan_v1'

const state = reactive({
  latestPlan: null,
})

export function setLatestRoutePlan(payload) {
  state.latestPlan = payload || null
  if (payload) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

export function restoreLatestRoutePlan() {
  if (state.latestPlan) return state.latestPlan
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    state.latestPlan = JSON.parse(raw)
  } catch (_error) {
    state.latestPlan = null
    sessionStorage.removeItem(STORAGE_KEY)
  }
  return state.latestPlan
}

export function useRoutePlanState() {
  return state
}
