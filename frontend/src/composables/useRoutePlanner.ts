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

const routeDifficultySlots = ['Easy', 'Moderate', 'Hard']

export function formatDuration(durationMin: number): string {
  const mins = Math.max(Number(durationMin) || 0, 0)
  if (mins < 90) return `${Math.round(mins)} min`
  const totalHours = mins / 60
  if (totalHours < 24) {
    const hours = Math.floor(totalHours); const rm = Math.round(mins % 60)
    if (!rm) return `${hours} h`; return `${hours} h ${rm} min`
  }
  const days = Math.floor(totalHours / 24); const h = Math.round(totalHours % 24)
  return h ? `${days} d ${h} h` : `${days} d`
}

function buildRouteChoices(planPayload: any): any[] {
  if (!planPayload) return []
  const fromApi = Array.isArray(planPayload.routeOptions) ? planPayload.routeOptions.slice(0, 3) : []
  if (fromApi.length) {
    const sel: any[] = []; const ids = new Set<string>()
    routeDifficultySlots.forEach(slot => {
      const m = fromApi.find((i: any) => i.targetDifficulty === slot && !ids.has(i.id)) || fromApi.find((i: any) => !ids.has(i.id))
      if (!m) return; ids.add(m.id); sel.push({ ...m, slotDifficulty: slot, optionLabel: slot })
    })
    return sel
  }
  const pool = [planPayload.recommendedRoute, ...(planPayload.alternatives || [])].filter(Boolean)
  const sel: any[] = []; const ids = new Set<string>()
  routeDifficultySlots.forEach(slot => { const h = pool.find((i: any) => i.difficulty === slot && !ids.has(i.id)); if (!h) return; ids.add(h.id); sel.push({ ...h, slotDifficulty: slot, optionLabel: slot }) })
  pool.forEach((item: any) => { if (sel.length >= 3 || ids.has(item.id)) return; const s = routeDifficultySlots[sel.length] || item.difficulty || 'Moderate'; ids.add(item.id); sel.push({ ...item, slotDifficulty: s, optionLabel: s }) })
  return sel.slice(0, 3)
}

export const layerMeta: Record<string, { label: string; color: string }> = {
  fire: { label: 'Bushfire', color: '#D84727' }, flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' }, heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' }, other: { label: 'Other', color: '#2E7D6B' },
}

export function useRoutePlanner() {
  const router = useRouter()

  const plannerPanel = ref<HTMLElement | null>(null)
  const plannerPanelBody = ref<HTMLElement | null>(null)
  const plannerSummary = ref<HTMLElement | null>(null)
  const plannerError = ref<HTMLElement | null>(null)
  const plannerMap = ref<any>(null)
  const loading = ref(false)
  const loadingHistory = ref(false)
  const clearingHistory = ref(false)
  const deletingHistoryId = ref('')
  const error = ref('')
  const startPoint = ref<{ lat: number; lng: number } | null>(null)
  const endPoint = ref<{ lat: number; lng: number } | null>(null)
  const planResult = ref<any>(null)
  const isSheetExpanded = ref(false)
  const selectedRouteId = ref('')
  const historyItems = ref<any[]>([])
  const startInput = ref('')
  const endInput = ref('')
  const startSuggestions = ref<any[]>([])
  const endSuggestions = ref<any[]>([])
  const startLabel = ref('')
  const endLabel = ref('')

  let inflightController: AbortController | null = null
  let historyInflightController: AbortController | null = null
  let startSearchController: AbortController | null = null
  let endSearchController: AbortController | null = null
  let startReverseLookupController: AbortController | null = null
  let endReverseLookupController: AbortController | null = null
  let startReverseLookupRequestId = 0
  let endReverseLookupRequestId = 0
  let startSearchTimer: ReturnType<typeof setTimeout> | null = null
  let endSearchTimer: ReturnType<typeof setTimeout> | null = null

  function resolveElement(el: Element | { $el?: Element } | null): HTMLElement | null {
    const candidate = el && '$el' in el ? el.$el : el
    return candidate instanceof HTMLElement ? candidate : null
  }

  function setPlannerPanel(el: Element | { $el?: Element } | null) {
    plannerPanel.value = resolveElement(el)
  }

  function setPlannerPanelBody(el: Element | { $el?: Element } | null) {
    plannerPanelBody.value = resolveElement(el)
  }

  function setPlannerSummary(el: Element | { $el?: Element } | null) {
    plannerSummary.value = resolveElement(el)
  }

  function setPlannerError(el: Element | { $el?: Element } | null) {
    plannerError.value = resolveElement(el)
  }

  function setPlannerMap(instance: any) {
    plannerMap.value = instance
  }

  const canPlan = computed(() => Boolean(startPoint.value && endPoint.value && !loading.value))
  const routeChoices = computed(() => buildRouteChoices(planResult.value))
  const selectedRoute = computed(() => {
    if (!routeChoices.value.length) return null
    return routeChoices.value.find((i: any) => i.id === selectedRouteId.value) || routeChoices.value[0]
  })
  const summary = computed(() => {
    const r = selectedRoute.value; if (!r) return null
    return {
      distance: `${r.distanceKm.toFixed(1)} km`, duration: formatDuration(r.durationMin),
      difficulty: r.slotDifficulty || r.difficulty, risk: r.riskLevel, goNoGo: r.goNoGo,
      safetyStatus: (r.safetyStatus === 'Dangerous' || r.goNoGo === 'No-Go' || r.goNoGo === 'Dangerous') ? 'Dangerous' : 'Safe',
      isDangerous: r.safetyStatus === 'Dangerous' || r.goNoGo === 'No-Go' || r.goNoGo === 'Dangerous',
      intro: r.intro || r.explanation, zoneSummary: r.zoneSummary || { level1Count: 0, level2Count: 0, level3Count: 0 },
    }
  })

  function applyPointSelection(type: string, location: any) {
    if (!location) return
    const pt = { lat: Number(Number(location.lat).toFixed(6)), lng: Number(Number(location.lng).toFixed(6)) }
    if (type === 'start') { startPoint.value = pt; startLabel.value = location.displayName || ''; startInput.value = startLabel.value || 'Selected location'; startSuggestions.value = [] }
    else { endPoint.value = pt; endLabel.value = location.displayName || ''; endInput.value = endLabel.value || 'Selected location'; endSuggestions.value = [] }
    planResult.value = null; selectedRouteId.value = ''; plannerMap.value?.focusPoint(pt)
  }

  async function runLocationSearch(type: string, query: string, ctrl: AbortController) {
    try {
      const r = await searchLocations(String(query || '').trim(), { signal: ctrl.signal, limit: 6 })
      if (type === 'start' && startSearchController === ctrl) startSuggestions.value = r
      else if (type === 'end' && endSearchController === ctrl) endSuggestions.value = r
    } catch (e: any) { if (e?.name === 'AbortError') return; if (type === 'start' && startSearchController === ctrl) startSuggestions.value = []; else if (type === 'end' && endSearchController === ctrl) endSuggestions.value = [] }
  }

  function handleSearchInput({ type, value }: { type: string; value: string }) {
    const t = String(value || '').trim()
    if (type === 'start') { startInput.value = value; if (startSearchTimer) clearTimeout(startSearchTimer); startSearchController?.abort() }
    else { endInput.value = value; if (endSearchTimer) clearTimeout(endSearchTimer); endSearchController?.abort() }
    if (t.length < 2) { if (type === 'start') startSuggestions.value = []; else endSuggestions.value = []; return }
    const ctrl = new AbortController()
    if (type === 'start') { startSearchController = ctrl; startSearchTimer = setTimeout(() => runLocationSearch(type, t, ctrl), 350) }
    else { endSearchController = ctrl; endSearchTimer = setTimeout(() => runLocationSearch(type, t, ctrl), 350) }
  }

  function handlePointInputFocus(type: string) {
    if (type === 'start') { startInput.value = ''; startSuggestions.value = []; return }
    endInput.value = ''; endSuggestions.value = []
  }

  function pointMatches(a: any, b: any): boolean {
    if (!a || !b) return false
    return a.lat === b.lat && a.lng === b.lng
  }

  async function reverseLookupPointName(type: string, pt: { lat: number; lng: number }) {
    if (!pt) return null
    const ctrl = new AbortController()
    const reqId = type === 'start' ? ++startReverseLookupRequestId : ++endReverseLookupRequestId
    if (type === 'start') { startReverseLookupController?.abort(); startReverseLookupController = ctrl }
    else { endReverseLookupController?.abort(); endReverseLookupController = ctrl }
    try {
      const result = await (reverseLocation as any)(pt.lat, pt.lng, { signal: ctrl.signal })
      return { result, requestId: reqId }
    } catch { return null }
  }

  async function applyPointFromMap(type: string, point: any) {
    applyPointSelection(type, { lat: point.lat, lng: point.lng, displayName: 'Dropped pin location' })
    const reversePayload = await reverseLookupPointName(type, point)
    if (!reversePayload?.result?.displayName) return
    const currentPoint = type === 'start' ? startPoint.value : endPoint.value
    const activeRequestId = type === 'start' ? startReverseLookupRequestId : endReverseLookupRequestId
    if (!pointMatches(currentPoint, point) || reversePayload.requestId !== activeRequestId) return
    applyPointSelection(type, { lat: point.lat, lng: point.lng, displayName: reversePayload.result.displayName })
  }

  function handleMapClick(point: any) {
    error.value = ''
    if (startPoint.value && endPoint.value) { error.value = 'Start and destination are locked. Use Reset Points to choose a new route.'; return }
    const target = !startPoint.value ? 'start' : 'end'
    void applyPointFromMap(target, point)
  }

  function resetSelection() {
    startPoint.value = null; endPoint.value = null; startLabel.value = ''; endLabel.value = ''
    startInput.value = ''; endInput.value = ''; startSuggestions.value = []; endSuggestions.value = []
    error.value = ''; planResult.value = null; selectedRouteId.value = ''; setLatestRoutePlan(null)
  }

  async function handlePlanRoute() {
    if (!canPlan.value) return
    if (inflightController) inflightController.abort()
    inflightController = new AbortController(); loading.value = true; error.value = ''
    try {
      const payload = await planSafeRoute({ start: startPoint.value!, end: endPoint.value!, signal: inflightController.signal })
      planResult.value = payload; selectedRouteId.value = buildRouteChoices(payload)[0]?.id || ''
      setLatestRoutePlan({ ...payload, recommendedRoute: buildRouteChoices(payload)[0] || payload.recommendedRoute, start: startPoint.value, end: endPoint.value } as any)
      isSheetExpanded.value = true
      await nextTick()
      plannerSummary.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e: any) { if (e?.name === 'AbortError') return; error.value = e.message || 'Failed to generate a safe route' }
    finally { loading.value = false }
  }

  function selectRoute(routeId: string) { if (routeId && routeId !== selectedRouteId.value) selectedRouteId.value = routeId }
  function toggleSheet() { isSheetExpanded.value = !isSheetExpanded.value }

  function goToDetails() {
    const s = selectedRoute.value; if (!s || !planResult.value) return
    setLatestRoutePlan({ ...planResult.value, recommendedRoute: s, start: startPoint.value, end: endPoint.value })
    router.push('/route-detail')
  }

  async function loadHistory() {
    if (historyInflightController) historyInflightController.abort()
    historyInflightController = new AbortController(); loadingHistory.value = true
    try { const p = await fetchRoutePlanHistory({ limit: 15, signal: historyInflightController.signal }); historyItems.value = p.history }
    catch (e: any) { if (e?.name !== 'AbortError') console.warn('History load failed:', e.message) }
    finally { loadingHistory.value = false }
  }

  async function clearAllHistory() {
    if (!historyItems.value.length || clearingHistory.value) return
    if (!window.confirm('Clear all route history?')) return
    clearingHistory.value = true
    try { await clearRoutePlanHistory(); historyItems.value = [] }
    catch (e: any) { if (e?.name !== 'AbortError') error.value = e.message || 'Failed to clear history' }
    finally { clearingHistory.value = false }
  }

  async function clearHistoryItem(itemId: string) {
    if (!itemId || deletingHistoryId.value) return
    deletingHistoryId.value = String(itemId)
    try { await deleteRoutePlanHistoryItem({ id: itemId }); historyItems.value = historyItems.value.filter(i => String(i.id) !== String(itemId)) }
    catch (e: any) { error.value = e.message || 'Failed to delete item' }
    finally { deletingHistoryId.value = '' }
  }

  function applyHistoryPlan(item: any) {
    if (!item?.planPayload) return
    startPoint.value = item.start || null; endPoint.value = item.end || null
    startInput.value = ''; endInput.value = ''; startSuggestions.value = []; endSuggestions.value = []
    planResult.value = item.planPayload
    const choices = buildRouteChoices(item.planPayload)
    selectedRouteId.value = item.planPayload?.recommendedRoute?.id || choices[0]?.id || ''
    setLatestRoutePlan({ ...item.planPayload, recommendedRoute: choices.find((r: any) => r.id === selectedRouteId.value) || choices[0] || item.planPayload.recommendedRoute, start: startPoint.value, end: endPoint.value })
  }

  onMounted(() => { void loadHistory() })
  onUnmounted(() => {
    (inflightController as any)?.abort();
    (historyInflightController as any)?.abort()
    if (startSearchTimer) clearTimeout(startSearchTimer);
    if (endSearchTimer) clearTimeout(endSearchTimer);
    (startSearchController as any)?.abort();
    (endSearchController as any)?.abort();
    (startReverseLookupController as any)?.abort();
    (endReverseLookupController as any)?.abort()
  })

  return {
    plannerPanel, plannerPanelBody, plannerSummary, plannerError, plannerMap,
    loading, loadingHistory, clearingHistory, deletingHistoryId, error,
    startPoint, endPoint, planResult, isSheetExpanded, selectedRouteId, historyItems,
    startInput, endInput, startSuggestions, endSuggestions, startLabel, endLabel,
    canPlan, routeChoices, selectedRoute, summary,
    handleSearchInput, handlePointInputFocus, applyPointSelection,
    handleMapClick, resetSelection, handlePlanRoute, selectRoute, toggleSheet,
    goToDetails, loadHistory, clearAllHistory, clearHistoryItem, applyHistoryPlan,
    setPlannerPanel, setPlannerPanelBody, setPlannerSummary, setPlannerError, setPlannerMap,
  }
}
