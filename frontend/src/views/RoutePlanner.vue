<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  clearRoutePlanHistory,
  deleteRoutePlanHistoryItem,
  fetchRoutePlanHistory,
  planSafeRoute
} from '../services/routeApi'
import { reverseLocation, searchLocations } from '../services/locationApi'
import { setLatestRoutePlan } from '../services/routePlanStore'
import { useAuthState } from '../services/authStore'
import PlannerMap from '../components/PlannerMap.vue'
import PlannerPointSearch from '../components/PlannerPointSearch.vue'
import PlannerActionBar from '../components/PlannerActionBar.vue'
import PlannerRouteSummary from '../components/PlannerRouteSummary.vue'
import PlannerHistoryPanel from '../components/PlannerHistoryPanel.vue'
import PlannerHazardLegend from '../components/PlannerHazardLegend.vue'

const router = useRouter()
const { state: authState } = useAuthState()
const plannerPanel = ref(null)
const plannerPanelBody = ref(null)
const plannerSummary = ref(null)
const plannerError = ref(null)
const plannerMap = ref(null)
const loading = ref(false)
const loadingHistory = ref(false)
const clearingHistory = ref(false)
const deletingHistoryId = ref('')
const error = ref('')
const startPoint = ref(null)
const endPoint = ref(null)
const planResult = ref(null)
const isSheetExpanded = ref(false)
const selectedRouteId = ref('')
const historyItems = ref([])
const startInput = ref('')
const endInput = ref('')
const startSuggestions = ref([])
const endSuggestions = ref([])
const startLabel = ref('')
const endLabel = ref('')

let inflightController
let historyInflightController
let startSearchController
let endSearchController
let startReverseLookupController
let endReverseLookupController
let startReverseLookupRequestId = 0
let endReverseLookupRequestId = 0
let startSearchTimer
let endSearchTimer

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}
const routeDifficultySlots = ['Easy', 'Moderate', 'Hard']

function formatDuration(durationMin) {
  const mins = Math.max(Number(durationMin) || 0, 0)
  if (mins < 90) return `${Math.round(mins)} min`

  const totalHours = mins / 60
  if (totalHours < 24) {
    const hours = Math.floor(totalHours)
    const remainingMin = Math.round(mins % 60)
    if (!remainingMin) return `${hours} h`
    return `${hours} h ${remainingMin} min`
  }

  const days = Math.floor(totalHours / 24)
  const hours = Math.round(totalHours % 24)
  return hours ? `${days} d ${hours} h` : `${days} d`
}

function formatPointLabel(label, point) {
  if (!point) return ''
  return label || 'Selected location'
}

function formatPointCoordinates(point) {
  if (!point) return ''
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
}

function handlePointInputFocus(type) {
  if (type === 'start') {
    startInput.value = ''
    startSuggestions.value = []
    return
  }
  endInput.value = ''
  endSuggestions.value = []
}

function applyPointSelection(type, location) {
  if (!location) return
  const point = {
    lat: Number(Number(location.lat).toFixed(6)),
    lng: Number(Number(location.lng).toFixed(6)),
  }
  if (type === 'start') {
    startPoint.value = point
    startLabel.value = location.displayName || ''
    startInput.value = startLabel.value || 'Selected location'
    startSuggestions.value = []
  } else {
    endPoint.value = point
    endLabel.value = location.displayName || ''
    endInput.value = endLabel.value || 'Selected location'
    endSuggestions.value = []
  }

  planResult.value = null
  selectedRouteId.value = ''
  plannerMap.value?.focusPoint(point)
}

function pointMatches(currentPoint, nextPoint) {
  if (!currentPoint || !nextPoint) return false
  return currentPoint.lat === nextPoint.lat && currentPoint.lng === nextPoint.lng
}

async function runLocationSearch(type, query, controller) {
  try {
    const results = await searchLocations(String(query || '').trim(), {
      signal: controller.signal,
      limit: 6,
    })
    if (type === 'start' && startSearchController === controller) startSuggestions.value = results
    else if (type === 'end' && endSearchController === controller) endSuggestions.value = results
  } catch (error) {
    if (error?.name === 'AbortError') return
    if (type === 'start' && startSearchController === controller) startSuggestions.value = []
    else if (type === 'end' && endSearchController === controller) endSuggestions.value = []
  }
}

function handleSearchInput({ type, value }) {
  const text = String(value || '').trim()
  if (type === 'start') {
    startInput.value = value
    if (startSearchTimer) window.clearTimeout(startSearchTimer)
    if (startSearchController) startSearchController.abort()
  } else {
    endInput.value = value
    if (endSearchTimer) window.clearTimeout(endSearchTimer)
    if (endSearchController) endSearchController.abort()
  }

  if (text.length < 2) {
    if (type === 'start') startSuggestions.value = []
    else endSuggestions.value = []
    return
  }

  const controller = new AbortController()
  const search = () => runLocationSearch(type, text, controller)
  if (type === 'start') {
    startSearchController = controller
    startSearchTimer = window.setTimeout(search, 350)
  } else {
    endSearchController = controller
    endSearchTimer = window.setTimeout(search, 350)
  }
}

async function reverseLookupPointName(type, point) {
  if (!point) return null
  const controller = new AbortController()
  const requestId = type === 'start'
    ? ++startReverseLookupRequestId
    : ++endReverseLookupRequestId

  if (type === 'start') {
    if (startReverseLookupController) startReverseLookupController.abort()
    startReverseLookupController = controller
  } else {
    if (endReverseLookupController) endReverseLookupController.abort()
    endReverseLookupController = controller
  }

  try {
    const result = await reverseLocation(point.lat, point.lng, {
      signal: controller.signal,
    })
    return { result, requestId }
  } catch (error) {
    return null
  }
}

async function applyPointFromMap(type, point) {
  applyPointSelection(type, {
    lat: point.lat,
    lng: point.lng,
    displayName: 'Dropped pin location',
  })

  const reversePayload = await reverseLookupPointName(type, point)
  if (!reversePayload?.result?.displayName) return

  const currentPoint = type === 'start' ? startPoint.value : endPoint.value
  const activeRequestId = type === 'start' ? startReverseLookupRequestId : endReverseLookupRequestId
  if (!pointMatches(currentPoint, point) || reversePayload.requestId !== activeRequestId) return

  applyPointSelection(type, {
    lat: point.lat,
    lng: point.lng,
    displayName: reversePayload.result.displayName,
  })
}

function handleMapClick(point) {
  error.value = ''
  if (startPoint.value && endPoint.value) {
    void showPlannerError('Start and destination are locked. Use Reset Points to choose a new route.')
    return
  }

  const target = !startPoint.value ? 'start' : 'end'
  void applyPointFromMap(target, point)
}

const canPlan = computed(() => Boolean(startPoint.value && endPoint.value && !loading.value))

function isDangerousGoNoGo(value) {
  return value === 'No-Go' || value === 'Dangerous'
}

function formatSafetyStatus(route) {
  if (route?.safetyStatus === 'Dangerous' || route?.goNoGo === 'No-Go' || route?.goNoGo === 'Dangerous') return 'Dangerous'
  return 'Safe'
}

function buildRouteChoices(planPayload) {
  if (!planPayload) return []

  const fromApi = Array.isArray(planPayload.routeOptions) ? planPayload.routeOptions.slice(0, 3) : []
  if (fromApi.length) {
    const selected = []
    const usedIds = new Set()

    routeDifficultySlots.forEach((slot) => {
      const matchBySlot = fromApi.find((item) => item.targetDifficulty === slot && !usedIds.has(item.id))
      const fallbackUnique = fromApi.find((item) => !usedIds.has(item.id))
      const match = matchBySlot || fallbackUnique || null
      if (!match) return
      usedIds.add(match.id)
      selected.push({
        ...match,
        slotDifficulty: slot,
        optionLabel: slot,
      })
    })

    return selected
  }

  const pool = [planPayload.recommendedRoute, ...(planPayload.alternatives || [])].filter(Boolean)
  const selected = []
  const usedIds = new Set()
  routeDifficultySlots.forEach((slot) => {
    const hit = pool.find((item) => item.difficulty === slot && !usedIds.has(item.id))
    if (!hit) return
    usedIds.add(hit.id)
    selected.push({ ...hit, slotDifficulty: slot, optionLabel: slot })
  })
  pool.forEach((item) => {
    if (selected.length >= 3 || usedIds.has(item.id)) return
    const slot = routeDifficultySlots[selected.length] || item.difficulty || 'Moderate'
    usedIds.add(item.id)
    selected.push({ ...item, slotDifficulty: slot, optionLabel: slot })
  })
  return selected.slice(0, 3)
}

const routeChoices = computed(() => buildRouteChoices(planResult.value))

const selectedRoute = computed(() => {
  if (!routeChoices.value.length) return null
  const current = routeChoices.value.find((item) => item.id === selectedRouteId.value)
  return current || routeChoices.value[0]
})

const summary = computed(() => {
  const route = selectedRoute.value
  if (!route) return null
  return {
    distance: `${route.distanceKm.toFixed(1)} km`,
    duration: formatDuration(route.durationMin),
    difficulty: route.slotDifficulty || route.difficulty,
    risk: route.riskLevel,
    goNoGo: route.goNoGo,
    safetyStatus: formatSafetyStatus(route),
    isDangerous: isDangerousGoNoGo(route.safetyStatus || route.goNoGo),
    intro: route.intro || route.explanation,
    zoneSummary: route.zoneSummary || { level1Count: 0, level2Count: 0, level3Count: 0 },
  }
})

function getPlannerScrollContainer() {
  if (plannerPanelBody.value?.scrollHeight > plannerPanelBody.value?.clientHeight) {
    return plannerPanelBody.value
  }
  if (plannerPanel.value?.scrollHeight > plannerPanel.value?.clientHeight) {
    return plannerPanel.value
  }
  return null
}

async function scrollToPlanResult() {
  await nextTick()
  plannerSummary.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

async function scrollToPlannerError() {
  await nextTick()
  plannerError.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

async function showPlannerError(message) {
  error.value = message || 'Failed to generate a safe route'
  await scrollToPlannerError()
}

function scrollToPlannerTop() {
  const scrollContainer = getPlannerScrollContainer()
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetSelection() {
  startPoint.value = null
  endPoint.value = null
  startLabel.value = ''
  endLabel.value = ''
  startInput.value = ''
  endInput.value = ''
  startSuggestions.value = []
  endSuggestions.value = []
  error.value = ''
  planResult.value = null
  selectedRouteId.value = ''
  setLatestRoutePlan(null)
}

function applyHistoryPlan(item) {
  if (!item?.planPayload) return
  startPoint.value = item.start || null
  endPoint.value = item.end || null
  startLabel.value = ''
  endLabel.value = ''
  startInput.value = startPoint.value ? formatPointLabel(startLabel.value, startPoint.value) : ''
  endInput.value = endPoint.value ? formatPointLabel(endLabel.value, endPoint.value) : ''
  startSuggestions.value = []
  endSuggestions.value = []
  planResult.value = item.planPayload
  const choices = buildRouteChoices(item.planPayload)
  selectedRouteId.value = item.planPayload?.recommendedRoute?.id || choices[0]?.id || ''
  setLatestRoutePlan({
    ...item.planPayload,
    recommendedRoute: choices.find((route) => route.id === selectedRouteId.value) || choices[0] || item.planPayload.recommendedRoute,
    start: startPoint.value,
    end: endPoint.value,
  })
}

async function loadHistory() {
  if (historyInflightController) historyInflightController.abort()
  historyInflightController = new AbortController()
  loadingHistory.value = true
  try {
    const payload = await fetchRoutePlanHistory({
      token: authState.token || '',
      limit: 15,
      signal: historyInflightController.signal,
    })
    historyItems.value = payload.history
  } catch (nextError) {
    if (nextError?.name !== 'AbortError') {
      console.warn('Failed to load route plan history:', nextError.message)
    }
  } finally {
    loadingHistory.value = false
  }
}

async function clearAllHistory() {
  if (!historyItems.value.length || clearingHistory.value) return
  const confirmed = window.confirm('Clear all route history records?')
  if (!confirmed) return

  clearingHistory.value = true
  try {
    await clearRoutePlanHistory({
      token: authState.token || '',
    })
    historyItems.value = []
  } catch (nextError) {
    if (nextError?.name !== 'AbortError') {
      void showPlannerError(nextError.message || 'Failed to clear route history')
    }
  } finally {
    clearingHistory.value = false
  }
}

async function clearHistoryItem(itemId) {
  if (!itemId || deletingHistoryId.value) return
  deletingHistoryId.value = String(itemId)
  try {
    await deleteRoutePlanHistoryItem({
      id: itemId,
      token: authState.token || '',
    })
    historyItems.value = historyItems.value.filter((item) => String(item.id) !== String(itemId))
  } catch (nextError) {
    void showPlannerError(nextError.message || 'Failed to clear route history item')
  } finally {
    deletingHistoryId.value = ''
  }
}

async function handlePlanRoute() {
  if (!canPlan.value) return
  if (inflightController) inflightController.abort()
  inflightController = new AbortController()

  loading.value = true
  error.value = ''

  try {
    const payload = await planSafeRoute({
      start: startPoint.value,
      end: endPoint.value,
      token: authState.token || '',
      signal: inflightController.signal,
    })

    planResult.value = payload
    const choices = buildRouteChoices(payload)
    selectedRouteId.value = choices[0]?.id || ''

    setLatestRoutePlan({
      ...payload,
      recommendedRoute: choices[0] || payload.recommendedRoute,
      start: startPoint.value,
      end: endPoint.value,
    })

    isSheetExpanded.value = true
    await scrollToPlanResult()
    await loadHistory()
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    await showPlannerError(nextError.message || 'Failed to generate a safe route')
  } finally {
    loading.value = false
  }
}

function goToDetails() {
  const selected = selectedRoute.value
  if (!selected || !planResult.value) return
  setLatestRoutePlan({
    ...planResult.value,
    recommendedRoute: selected,
    start: startPoint.value,
    end: endPoint.value,
  })
  router.push('/route-detail')
}

function selectRoute(routeId) {
  if (!routeId || routeId === selectedRouteId.value) return
  selectedRouteId.value = routeId
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

onMounted(() => {
  void loadHistory()
})

onUnmounted(() => {
  if (inflightController) inflightController.abort()
  if (historyInflightController) historyInflightController.abort()
  if (startSearchTimer) window.clearTimeout(startSearchTimer)
  if (endSearchTimer) window.clearTimeout(endSearchTimer)
  if (startSearchController) startSearchController.abort()
  if (endSearchController) endSearchController.abort()
  if (startReverseLookupController) startReverseLookupController.abort()
  if (endReverseLookupController) endReverseLookupController.abort()
})
</script>

<template>
  <main class="planner-layout">
    <aside ref="plannerPanel" class="planner-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': isSheetExpanded }">
      <div class="mobile-sheet__handle"></div>
      <div class="planner-mobile-actions">
        <button class="mobile-sheet-toggle" @click="toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ isSheetExpanded ? 'expand_more' : 'expand_less' }}</span>
          {{ isSheetExpanded ? 'Show Less' : 'Route Panel' }}
        </button>
      </div>
      <div ref="plannerPanelBody" class="mobile-sheet__body planner-panel__body">
      <div>
        <p class="planner-kicker">Pre-Hike Safety Planner</p>
        <h1>Plan Route</h1>
        <p class="planner-sub">Click map to set start and destination. Route safety is personalized by your level.</p>
      </div>

      <PlannerPointSearch
        :start-input="startInput"
        :end-input="endInput"
        :start-point="startPoint"
        :end-point="endPoint"
        :start-label="startLabel"
        :end-label="endLabel"
        :start-suggestions="startSuggestions"
        :end-suggestions="endSuggestions"
        @focus-input="handlePointInputFocus"
        @search-input="handleSearchInput"
        @select-location="({ type, location }) => applyPointSelection(type, location)"
      />

      <PlannerActionBar
        :can-plan="canPlan"
        :loading="loading"
        @plan-route="handlePlanRoute"
        @reset="resetSelection"
      />

      <p v-if="error" ref="plannerError" class="planner-error" role="alert">{{ error }}</p>

      <PlannerRouteSummary
        :route-choices="routeChoices"
        :selected-route-id="selectedRouteId"
        :summary="summary"
        @select-route="selectRoute"
        @view-details="goToDetails"
      />

      <PlannerHistoryPanel
        :history-items="historyItems"
        :loading="loadingHistory"
        :clearing-all="clearingHistory"
        :deleting-id="deletingHistoryId"
        @refresh="loadHistory"
        @clear-all="clearAllHistory"
        @clear-item="clearHistoryItem"
        @select-item="applyHistoryPlan"
      />

      <PlannerHazardLegend :layers="layerMeta" />

      <button
        v-if="summary"
        class="planner-back-top"
        type="button"
        aria-label="Back to top"
        title="Back to top"
        @click="scrollToPlannerTop"
      >
        <span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_up</span>
      </button>
      </div>
    </aside>

    <PlannerMap
      ref="plannerMap"
      :start-point="startPoint"
      :end-point="endPoint"
      :route-choices="routeChoices"
      :selected-route-id="selectedRouteId"
      @map-click="handleMapClick"
    />
  </main>
</template>

<style scoped>
.planner-layout {
  display: grid;
  grid-template-columns: minmax(370px, 410px) 1fr;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background:
    radial-gradient(circle at 0% 0%, rgba(143, 174, 131, 0.24), transparent 26rem),
    linear-gradient(130deg, #fffaf2 0%, #f2eee5 48%, #e7eee4 100%);
  position: relative;
}

.planner-panel {
  --mobile-sheet-peek: 250px;
  border-right: 1px solid rgba(33, 72, 59, 0.14);
  background: rgba(255, 250, 242, 0.86);
  backdrop-filter: blur(18px);
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  overflow: auto;
  position: relative;
  scroll-behavior: smooth;
}

.planner-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  scroll-behavior: smooth;
}

.planner-mobile-actions {
  display: none;
}

.planner-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6f897b;
  font-weight: 900;
}

h1 {
  margin-top: 0.25rem;
  font-size: 2rem;
  line-height: 1;
  font-weight: 700;
  color: #173b31;
}

.planner-sub {
  color: #4c635d;
  font-size: 0.88rem;
  margin-top: 0.4rem;
}

.planner-error {
  background: #fff1ef;
  border: 1px solid #e9b7ae;
  color: #7c271f;
  border-radius: 0.65rem;
  padding: 0.58rem;
  font-size: 0.84rem;
}

.planner-back-top {
  border: 1px solid rgba(33, 72, 59, 0.16);
  border-radius: 999px;
  background: rgba(255, 250, 242, 0.96);
  color: #21483b;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  align-self: flex-end;
  position: sticky;
  bottom: 0.35rem;
  margin-top: -0.25rem;
  box-shadow: 0 14px 28px rgba(23, 59, 49, 0.16);
  backdrop-filter: blur(10px);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  z-index: 5;
}

.planner-back-top:hover {
  background: #ffffff;
  border-color: rgba(33, 72, 59, 0.3);
  transform: translateY(-2px);
}

.planner-back-top .material-symbols-outlined {
  font-size: 1.65rem;
  line-height: 1;
}

@media (max-width: 980px) {
  .planner-layout {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .planner-panel {
    border-right: 0;
    border-top: 1px solid rgba(33, 72, 59, 0.14);
    padding: 0 1rem 1rem;
    background: rgba(255, 250, 242, 0.96);
  }

  .planner-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.45rem;
  }
}
</style>
