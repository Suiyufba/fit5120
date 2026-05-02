<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  clearRoutePlanHistory,
  deleteRoutePlanHistoryItem,
  fetchRoutePlanHistory,
  planSafeRoute
} from '../services/routeApi'
import { reverseLocation, searchLocations } from '../services/locationApi'
import { setLatestRoutePlan } from '../services/routePlanStore'
import { useAuthState } from '../services/authStore'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  applyVictoriaMapConstraints,
  clampBoundsToVictoria,
  getMapBboxWithinVictoria,
  isLatLngInVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'

const router = useRouter()
const { state: authState } = useAuthState()
const mapElement = ref(null)
const plannerPanel = ref(null)
const plannerPanelBody = ref(null)
const plannerSummary = ref(null)
const loading = ref(false)
const loadingHistory = ref(false)
const clearingHistory = ref(false)
const deletingHistoryId = ref('')
const error = ref('')
const startPoint = ref(null)
const endPoint = ref(null)
const planResult = ref(null)
const hazards = ref([])
const isSheetExpanded = ref(false)
const selectedRouteId = ref('')
const historyItems = ref([])
const startInput = ref('')
const endInput = ref('')
const startSuggestions = ref([])
const endSuggestions = ref([])
const startLabel = ref('')
const endLabel = ref('')

let mapInstance
let markerLayer
let routeLayer
let hazardLayer
let inflightController
let hazardInflightController
let hazardRefreshTimer
let historyInflightController
let startSearchController
let endSearchController
let startReverseLookupController
let endReverseLookupController
let startReverseLookupRequestId = 0
let endReverseLookupRequestId = 0

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}
const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }
const routeDifficultySlots = ['Easy', 'Moderate', 'Hard']

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cleanPopupDescription(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?strong>/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function formatUpdatedTime(value) {
  const ts = Date.parse(value || '')
  if (Number.isNaN(ts)) return 'Time unknown'
  return new Date(ts).toLocaleString()
}

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
  renderMarkers()
  drawRoutes()
  if (mapInstance) {
    mapInstance.flyTo([point.lat, point.lng], Math.max(mapInstance.getZoom(), 11), { duration: 0.45 })
  }
}

function pointMatches(currentPoint, nextPoint) {
  if (!currentPoint || !nextPoint) return false
  return currentPoint.lat === nextPoint.lat && currentPoint.lng === nextPoint.lng
}

async function searchLocationOptions(type, query) {
  const text = String(query || '').trim()
  if (type === 'start') {
    startInput.value = query
    if (startSearchController) startSearchController.abort()
  } else {
    endInput.value = query
    if (endSearchController) endSearchController.abort()
  }

  if (text.length < 2) {
    if (type === 'start') startSuggestions.value = []
    else endSuggestions.value = []
    return
  }

  const controller = new AbortController()
  if (type === 'start') startSearchController = controller
  else endSearchController = controller

  try {
    const results = await searchLocations(text, {
      signal: controller.signal,
      limit: 6,
    })
    if (type === 'start') startSuggestions.value = results
    else endSuggestions.value = results
  } catch (error) {
    if (error?.name === 'AbortError') return
    if (type === 'start') startSuggestions.value = []
    else endSuggestions.value = []
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

const canPlan = computed(() => Boolean(startPoint.value && endPoint.value && !loading.value))

function isDangerousGoNoGo(value) {
  return value === 'No-Go' || value === 'Dangerous'
}

function formatGoNoGoLabel(value) {
  if (value === 'No-Go') return 'Dangerous'
  if (value === 'Go') return 'Safe'
  return value
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
    goNoGoLabel: formatGoNoGoLabel(route.goNoGo),
    isDangerous: isDangerousGoNoGo(route.goNoGo),
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

function scrollToPlannerTop() {
  const scrollContainer = getPlannerScrollContainer()
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function renderMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()

  if (startPoint.value) {
    L.marker([startPoint.value.lat, startPoint.value.lng], {
      icon: L.divIcon({
        className: 'planner-anchor-icon',
        html: '<div class="planner-anchor planner-anchor--start">S</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).bindPopup('Start point').addTo(markerLayer)
  }

  if (endPoint.value) {
    L.marker([endPoint.value.lat, endPoint.value.lng], {
      icon: L.divIcon({
        className: 'planner-anchor-icon',
        html: '<div class="planner-anchor planner-anchor--end">E</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).bindPopup('Destination').addTo(markerLayer)
  }
}

function zoneOpacitiesBySeverity(severity) {
  if (severity === 'extreme') return { l1: 0.28, l2: 0.18, l3: 0.1 }
  if (severity === 'high') return { l1: 0.23, l2: 0.14, l3: 0.08 }
  if (severity === 'moderate') return { l1: 0.18, l2: 0.11, l3: 0.06 }
  return { l1: 0.14, l2: 0.09, l3: 0.05 }
}

function markerRadiusBySeverity(severity) {
  if (severity === 'extreme') return 9
  if (severity === 'high') return 8
  if (severity === 'moderate') return 7
  return 6
}

function drawHazards() {
  if (!hazardLayer) return
  hazardLayer.clearLayers()

  hazards.value.forEach((hazard) => {
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return
    const meta = layerMeta[hazard.type] || layerMeta.other
    const opacity = zoneOpacitiesBySeverity(hazard.severity)

    ;[
      { radius: 5000, fillOpacity: opacity.l3, weight: 1 },
      { radius: 3000, fillOpacity: opacity.l2, weight: 1 },
      { radius: 1000, fillOpacity: opacity.l1, weight: 2 },
    ].forEach((zone) => {
      L.circle(hazard.coordinates, {
        radius: zone.radius,
        color: meta.color,
        fillColor: meta.color,
        fillOpacity: zone.fillOpacity,
        opacity: 0.4,
        weight: zone.weight,
        interactive: false,
      }).addTo(hazardLayer)
    })

    L.circleMarker(hazard.coordinates, {
      radius: markerRadiusBySeverity(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.88,
      weight: 2,
    })
      .bindPopup(
        `
        <div style="min-width: 200px;">
          <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(hazard.title)}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
          <div style="font-size: 11px; color: #5f6b66;">
            ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel[hazard.severity] || 'Unknown')}<br />
            Category: ${escapeHtml(hazard.type === 'other' ? 'Other' : (hazard.riskCategory || meta.label || 'Unspecified'))}<br />
            Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
            Source: ${escapeHtml(hazard.source)}
          </div>
        </div>
        `
      )
      .addTo(hazardLayer)
  })
}

async function loadHazards() {
  if (!mapInstance) return
  if (hazardInflightController) hazardInflightController.abort()
  hazardInflightController = new AbortController()

  try {
    const payload = await fetchRealtimeHazards({
      bbox: getMapBboxWithinVictoria(mapInstance),
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: hazardInflightController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        hazards.value = freshPayload.hazards
        drawHazards()
      },
    })
    hazards.value = payload.hazards
    drawHazards()
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    console.error('Failed to load hazards on planner map:', nextError)
  }
}

function drawRoutes() {
  if (!routeLayer) return
  routeLayer.clearLayers()

  const choices = routeChoices.value
  const currentSelected = selectedRoute.value
  choices.forEach((route) => {
    if (!Array.isArray(route.geometry) || route.geometry.length < 2) return
    const isSelected = currentSelected?.id === route.id
    const routeColor = route.slotDifficulty === 'Hard' ? '#A6382A' : route.slotDifficulty === 'Moderate' ? '#5A4B81' : '#1F6E57'
    L.polyline(route.geometry, {
      color: routeColor,
      weight: isSelected ? 6 : 4,
      opacity: isSelected ? 0.9 : 0.55,
      dashArray: isSelected ? '' : '8 8',
    }).addTo(routeLayer)
  })

  if (currentSelected?.geometry?.length) {
    const bounds = clampBoundsToVictoria(L.latLngBounds(currentSelected.geometry))
    mapInstance.fitBounds(bounds.pad(0.2))
  }
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
  renderMarkers()
  drawRoutes()
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
  renderMarkers()
  drawRoutes()
  void scrollToPlanResult()
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
      error.value = nextError.message || 'Failed to clear route history'
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
    error.value = nextError.message || 'Failed to clear route history item'
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
    drawRoutes()
    await scrollToPlanResult()
    await loadHistory()
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    error.value = nextError.message || 'Failed to generate a safe route'
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
  drawRoutes()
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

onMounted(() => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom)
  applyVictoriaMapConstraints(mapInstance)

  mapInstance.attributionControl.setPrefix(false)
  L.control.zoom({ position: 'topright' }).addTo(mapInstance)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  markerLayer = L.layerGroup().addTo(mapInstance)
  hazardLayer = L.layerGroup().addTo(mapInstance)
  routeLayer = L.layerGroup().addTo(mapInstance)
  loadHazards()
  hazardRefreshTimer = window.setInterval(loadHazards, 60_000)
  mapInstance.on('moveend', loadHazards)
  loadHistory()

  mapInstance.on('click', async (event) => {
    if (!isLatLngInVictoria(event.latlng)) {
      error.value = 'Start and destination points must be selected within Victoria.'
      return
    }

    const point = {
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6)),
    }

    error.value = ''
    if (startPoint.value && endPoint.value) {
      error.value = 'Start and destination are locked. Use Reset Points to choose a new route.'
      return
    }

    const target = !startPoint.value ? 'start' : 'end'
    void applyPointFromMap(target, point)
  })
})

onUnmounted(() => {
  if (inflightController) inflightController.abort()
  if (historyInflightController) historyInflightController.abort()
  if (startSearchController) startSearchController.abort()
  if (endSearchController) endSearchController.abort()
  if (startReverseLookupController) startReverseLookupController.abort()
  if (endReverseLookupController) endReverseLookupController.abort()
  if (hazardInflightController) hazardInflightController.abort()
  if (hazardRefreshTimer) window.clearInterval(hazardRefreshTimer)
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
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

      <div class="planner-points">
        <div class="point-card">
          <p>Start</p>
          <input
            class="point-input"
            type="text"
            placeholder="Type a start location"
            :value="startInput"
            @focus="handlePointInputFocus('start')"
            @input="searchLocationOptions('start', $event.target.value)"
          />
          <strong v-if="startPoint">{{ formatPointLabel(startLabel, startPoint) }}</strong>
          <span v-if="startPoint" class="point-coordinates">{{ formatPointCoordinates(startPoint) }}</span>
          <div v-if="startSuggestions.length" class="point-suggestions">
            <button
              v-for="item in startSuggestions"
              :key="`start-${item.lat}-${item.lng}`"
              type="button"
              class="point-suggestion"
              @click="applyPointSelection('start', item)"
            >
              {{ item.displayName }}
            </button>
          </div>
        </div>
        <div class="point-card">
          <p>Destination</p>
          <input
            class="point-input"
            type="text"
            placeholder="Type a destination"
            :value="endInput"
            @focus="handlePointInputFocus('end')"
            @input="searchLocationOptions('end', $event.target.value)"
          />
          <strong v-if="endPoint">{{ formatPointLabel(endLabel, endPoint) }}</strong>
          <span v-if="endPoint" class="point-coordinates">{{ formatPointCoordinates(endPoint) }}</span>
          <div v-if="endSuggestions.length" class="point-suggestions">
            <button
              v-for="item in endSuggestions"
              :key="`end-${item.lat}-${item.lng}`"
              type="button"
              class="point-suggestion"
              @click="applyPointSelection('end', item)"
            >
              {{ item.displayName }}
            </button>
          </div>
        </div>
      </div>

      <div class="planner-actions">
        <button class="primary-btn" :disabled="!canPlan" @click="handlePlanRoute">
          {{ loading ? 'Planning...' : 'Plan Safe Route' }}
        </button>
        <button class="ghost-btn" @click="resetSelection">Reset Points</button>
      </div>

      <section v-if="summary" ref="plannerSummary" class="planner-summary">
        <p class="summary-kicker">Choose One Route</p>
        <div class="route-options">
          <button
            v-for="option in routeChoices"
            :key="option.id"
            type="button"
            class="route-option-card"
            :class="{ 'route-option-card--active': selectedRoute?.id === option.id }"
            @click="selectRoute(option.id)"
          >
            <p class="route-option-card__title">{{ option.optionLabel }}</p>
            <p class="route-option-card__meta">
              {{ option.distanceKm.toFixed(1) }} km · {{ formatDuration(option.durationMin) }}
            </p>
            <p class="route-option-card__meta">Difficulty: {{ option.slotDifficulty || option.difficulty }}</p>
            <p class="route-option-card__risk">{{ option.riskLevel }}</p>
          </button>
        </div>
        <div class="summary-grid">
          <article><span>Distance</span><strong>{{ summary.distance }}</strong></article>
          <article><span>How Long It Takes</span><strong>{{ summary.duration }}</strong></article>
          <article><span>Difficulty</span><strong>{{ summary.difficulty }}</strong></article>
          <article><span>Risk</span><strong>{{ summary.risk }}</strong></article>
        </div>

        <div class="go-tag" :class="{ 'go-tag--danger': summary.isDangerous }">
          {{ summary.goNoGoLabel }}
        </div>
        <p class="summary-explain">{{ summary.intro }}</p>
        <button class="primary-btn" @click="goToDetails">View Route Details</button>
      </section>

      <section class="history-panel">
        <div class="history-panel__head">
          <p>Your Route History</p>
          <div class="history-actions">
            <button class="history-clear-all-btn" :disabled="clearingHistory || !historyItems.length" @click="clearAllHistory">
              {{ clearingHistory ? 'Clearing...' : 'Clear All' }}
            </button>
            <button class="history-refresh-btn" :disabled="loadingHistory" @click="loadHistory">
              {{ loadingHistory ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>
        <p v-if="!historyItems.length && !loadingHistory" class="history-empty">
          No route history yet. Plan a route to save your first record.
        </p>
        <div v-else class="history-list">
          <article
            v-for="item in historyItems"
            :key="item.id"
            class="history-item"
          >
            <button
              type="button"
              class="history-item__main"
              @click="applyHistoryPlan(item)"
            >
              <strong>
                {{ item.planPayload?.recommendedRoute?.distanceKm?.toFixed?.(1) || '0.0' }} km ·
                {{ formatDuration(item.planPayload?.recommendedRoute?.durationMin || 0) }}
              </strong>
              <span>
                {{ item.planPayload?.recommendedRoute?.riskLevel || 'Low' }}
              </span>
              <small>{{ new Date(item.createdAt).toLocaleString() }}</small>
            </button>
            <button
              type="button"
              class="history-item__clear"
              :disabled="deletingHistoryId === String(item.id)"
              @click.stop="clearHistoryItem(item.id)"
            >
              {{ deletingHistoryId === String(item.id) ? 'Clearing...' : 'Clear' }}
            </button>
          </article>
        </div>
      </section>

      <div class="hazard-legend">
        <p>Live Risk Layer</p>
        <div class="legend-items">
          <span v-for="(meta, id) in layerMeta" :key="id" class="legend-item">
            <i :style="{ background: meta.color }"></i>{{ meta.label }}
          </span>
        </div>
      </div>

      <p v-if="error" class="planner-error">{{ error }}</p>

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

    <section class="planner-map-wrap">
      <div ref="mapElement" class="planner-map"></div>
    </section>
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

.planner-points {
  display: grid;
  gap: 0.55rem;
}

.point-card {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.82rem;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.012), 0 2px 8px rgba(0,0,0,0.03), 0 10px 24px rgba(25,56,45,0.05);
  display: grid;
  gap: 0.38rem;
  position: relative;
}

.point-card p {
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-size: 0.68rem;
  color: #4f6b63;
  font-weight: 700;
}

.point-card strong {
  display: block;
  color: #213e37;
  font-size: 0.86rem;
  word-break: break-word;
}

.point-coordinates {
  color: #5f766d;
  font-size: 0.74rem;
}


.point-input {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.8rem;
  padding: 0.58rem 0.68rem;
  background: #ffffff;
  color: #23443a;
  font-size: 0.82rem;
}

.point-input:focus {
  outline: none;
  border-color: #2e7d6b;
  box-shadow: 0 0 0 2px rgba(46, 125, 107, 0.12);
}

.point-suggestions {
  display: grid;
  gap: 0.25rem;
  max-height: 140px;
  overflow: auto;
  padding-right: 0.1rem;
}

.point-suggestion {
  border: 1px solid #d7e5dd;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #32574b;
  text-align: left;
  font-size: 0.76rem;
  padding: 0.36rem 0.45rem;
}

.planner-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.primary-btn,
.ghost-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.82rem 1rem;
  font-weight: 800;
  min-height: 3rem;
  line-height: 1.1;
}

.primary-btn {
  background: linear-gradient(135deg, #173b31, #2f604e 68%, #7f9b75);
  color: #fffaf2;
  box-shadow: 0 14px 30px rgba(23, 59, 49, 0.2);
}

.primary-btn:disabled {
  opacity: 0.6;
}

.ghost-btn {
  border: 1px solid rgba(33, 72, 59, 0.16);
  background: rgba(255, 255, 255, 0.86);
  color: #21483b;
}

.planner-error {
  background: #fff1ef;
  border: 1px solid #e9b7ae;
  color: #7c271f;
  border-radius: 0.65rem;
  padding: 0.58rem;
  font-size: 0.84rem;
}

.history-panel {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.78rem;
  background: rgba(255, 255, 255, 0.86);
  display: grid;
  gap: 0.45rem;
}

.history-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.history-panel__head p {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3d6658;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.history-refresh-btn {
  border: 1px solid #bfd1c8;
  border-radius: 999px;
  background: #ffffff;
  color: #2f5448;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
}

.history-actions {
  display: inline-flex;
  gap: 0.3rem;
}

.history-clear-all-btn {
  border: 1px solid #e2b8b1;
  border-radius: 999px;
  background: #fff3f1;
  color: #8e2f25;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
}

.history-clear-all-btn:disabled,
.history-refresh-btn:disabled {
  opacity: 0.6;
}

.history-empty {
  font-size: 0.78rem;
  color: #45645b;
}

.history-list {
  display: grid;
  gap: 0.35rem;
  max-height: 180px;
  overflow: auto;
  padding-right: 0.15rem;
}

.history-item {
  border: 1px solid #dce6df;
  border-radius: 0.58rem;
  background: #ffffff;
  color: #27493f;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
  align-items: center;
}

.history-item__main {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.45rem 0.55rem;
  display: grid;
  gap: 0.1rem;
  color: inherit;
}

.history-item__main strong {
  font-size: 0.78rem;
}

.history-item__main span {
  font-size: 0.74rem;
  color: #49655d;
}

.history-item__main small {
  font-size: 0.68rem;
  color: #6a7f78;
}

.history-item__clear {
  border: 1px solid #e2b8b1;
  border-radius: 999px;
  background: #fff3f1;
  color: #8e2f25;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.22rem 0.5rem;
  margin-right: 0.55rem;
}

.history-item__clear:disabled {
  opacity: 0.6;
}

.hazard-legend {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.78rem;
  background: rgba(255, 255, 255, 0.86);
}

.hazard-legend p {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3d6658;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.legend-items {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid #dce6df;
  border-radius: 999px;
  padding: 0.2rem 0.45rem;
  font-size: 0.72rem;
  color: #35574b;
  background: #ffffff;
}

.legend-item i {
  display: inline-block;
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
}

.planner-summary {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.9rem;
  display: grid;
  gap: 0.7rem;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.012), 0 2px 8px rgba(0,0,0,0.03), 0 10px 24px rgba(25,56,45,0.05);
}

.summary-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.67rem;
  color: #3c6558;
  font-weight: 800;
}

.route-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.route-option-card {
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 0.9rem;
  background: #fffaf2;
  color: #2f4f45;
  text-align: left;
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.route-option-card--active {
  border-color: rgba(33, 72, 59, 0.34);
  background: #f2f7ee;
  box-shadow: 0 0 0 3px rgba(46, 125, 107, 0.13);
}

.route-option-card__title {
  font-size: 0.78rem;
  font-weight: 800;
}

.route-option-card__meta {
  margin-top: 0.1rem;
  font-size: 0.7rem;
  color: #456359;
}

.route-option-card__risk {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #33564b;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.summary-grid article {
  border: 1px solid #e0e9e2;
  border-radius: 0.6rem;
  padding: 0.5rem;
  background: #fbfefc;
}

.summary-grid span {
  font-size: 0.64rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #4b6860;
  font-weight: 700;
}

.summary-grid strong {
  display: block;
  margin-top: 0.2rem;
  color: #1f3931;
}

.go-tag {
  display: inline-flex;
  width: fit-content;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: #dbf5ea;
  color: #166645;
  font-weight: 800;
  font-size: 0.78rem;
}

.go-tag--danger {
  background: #ffe3e3;
  color: #a20f0f;
  border: 1px solid #ff8a8a;
  box-shadow: 0 0 0 2px rgba(214, 31, 31, 0.16);
}

.summary-explain {
  color: #3f5a54;
  font-size: 0.84rem;
  line-height: 1.45;
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

.zone-inline {
  color: #21473d;
  background: #edf7f2;
  border: 1px solid #d2e6db;
  border-radius: 0.55rem;
  padding: 0.42rem 0.52rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.planner-map-wrap {
  position: relative;
  padding: 0.85rem;
  background: #dfe8dd;
}

.planner-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 1.15rem;
  box-shadow: inset 0 0 0 1px rgba(33, 72, 59, 0.08), 0 20px 60px rgba(23, 59, 49, 0.12);
}

.planner-map :deep(.leaflet-control-attribution) {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.58);
}

.planner-map :deep(.planner-anchor-icon) {
  background: transparent;
  border: none;
}

.planner-map :deep(.planner-anchor) {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.24);
  border: 2px solid #ffffff;
}

.planner-map :deep(.planner-anchor--start) {
  background: #0f172a;
  color: #ffffff;
}

.planner-map :deep(.planner-anchor--end) {
  background: #ffffff;
  color: #0f172a;
  border-color: #0f172a;
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

  .planner-map-wrap {
    min-height: var(--mobile-safe-height);
  }

  .planner-map :deep(.leaflet-control-attribution) {
    display: none;
  }

  .route-options {
    grid-template-columns: 1fr;
  }

  .planner-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
