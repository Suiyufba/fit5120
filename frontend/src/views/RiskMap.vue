<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  applyVictoriaMapConstraints,
  getMapBboxWithinVictoria,
  getVictoriaBbox,
  isLatLngInVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'
import {
  createLeafletBaseLayer,
  DEFAULT_MAP_VISUAL_STYLE,
  MAP_VISUAL_STYLES,
} from '../utils/mapVisualStyles'

const REFRESH_EVERY_MS = 60_000
const router = useRouter()

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const mapElement = ref(null)
const selectedHazardId = ref('')
const hazards = ref([])
const statewideHazards = ref([])
const loading = ref(false)
const lastUpdatedAt = ref(null)
const isSheetExpanded = ref(false)
const selectedMapStyle = ref(DEFAULT_MAP_VISUAL_STYLE)
const isLocatingUser = ref(false)
const isViewingUserLocation = ref(false)

const severityOrder = { extreme: 4, high: 3, moderate: 2, low: 1 }
const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }

const filteredHazards = computed(() => {
  return hazards.value
    .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
})

const statewideStats = computed(() => {
  const stats = { extreme: 0, high: 0, moderate: 0, low: 0 }
  statewideHazards.value.forEach((hazard) => {
    if (stats[hazard.severity] !== undefined) stats[hazard.severity] += 1
  })
  return stats
})

let mapInstance
let markersLayer
let baseTileLayer
let userLocationLayer
let refreshTimer
let inflightController
let statewideInflightController

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

function resolveHazardVisual(hazard) {
  return layerMeta[hazard?.type] || layerMeta.other
}

function resolveCategoryLabel(hazard, meta) {
  if (hazard?.type === 'other') return 'Other'
  return hazard?.riskCategory || meta?.label || 'Unspecified'
}

function getMarkerRadius(severity) {
  if (severity === 'extreme') return 12
  if (severity === 'high') return 10
  if (severity === 'moderate') return 8
  return 6
}

function zoneOpacitiesBySeverity(severity) {
  if (severity === 'extreme') return { l1: 0.28, l2: 0.18, l3: 0.1 }
  if (severity === 'high') return { l1: 0.23, l2: 0.14, l3: 0.08 }
  if (severity === 'moderate') return { l1: 0.18, l2: 0.11, l3: 0.06 }
  return { l1: 0.14, l2: 0.09, l3: 0.05 }
}

function renderRiskCoverageZones(hazard, color) {
  const opacity = zoneOpacitiesBySeverity(hazard.severity)
  const circles = [
    { radius: 5000, fillOpacity: opacity.l3, weight: 1 },
    { radius: 3000, fillOpacity: opacity.l2, weight: 1 },
    { radius: 1000, fillOpacity: opacity.l1, weight: 2 },
  ]

  circles.forEach((zone) => {
    L.circle(hazard.coordinates, {
      radius: zone.radius,
      color,
      fillColor: color,
      fillOpacity: zone.fillOpacity,
      opacity: 0.45,
      weight: zone.weight,
      interactive: false,
    }).addTo(markersLayer)
  })
}

function renderMarkers() {
  if (!markersLayer) return
  markersLayer.clearLayers()

  filteredHazards.value.forEach((hazard) => {
    const meta = resolveHazardVisual(hazard)
    renderRiskCoverageZones(hazard, meta.color)

    const marker = L.circleMarker(hazard.coordinates, {
      radius: getMarkerRadius(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.8,
      weight: 2,
    })

    marker.bindPopup(
      `
      <div style="min-width: 200px;">
        <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(hazard.title)}</div>
        <div style="font-size: 12px; margin-bottom: 8px;">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
        <div style="font-size: 11px; color: #5f6b66;">
          ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel[hazard.severity] || 'Unknown')}<br />
          Category: ${escapeHtml(resolveCategoryLabel(hazard, meta))}<br />
          Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
          Source: ${escapeHtml(hazard.source)}
        </div>
      </div>
      `,
      { className: 'hs-map-popup' }
    )

    marker.addTo(markersLayer)
  })
}

async function loadHazards() {
  if (inflightController) inflightController.abort()
  inflightController = new AbortController()
  loading.value = true

  try {
    const nextPayload = await fetchRealtimeHazards({
      bbox: getMapBboxWithinVictoria(mapInstance),
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: inflightController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        hazards.value = freshPayload.hazards
        lastUpdatedAt.value = freshPayload.fetchedAt || freshPayload.cachedAt || new Date()
      },
    })

    hazards.value = nextPayload.hazards
    lastUpdatedAt.value = nextPayload.fetchedAt || nextPayload.cachedAt || new Date()
  } catch (error) {
    if (error?.name === 'AbortError') return
    console.error('Failed to load realtime hazards:', error)
  } finally {
    loading.value = false
  }
}

async function loadStatewideHazards() {
  if (statewideInflightController) statewideInflightController.abort()
  statewideInflightController = new AbortController()

  try {
    const nextPayload = await fetchRealtimeHazards({
      bbox: getVictoriaBbox(),
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: statewideInflightController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        statewideHazards.value = freshPayload.hazards
        lastUpdatedAt.value = freshPayload.fetchedAt || freshPayload.cachedAt || new Date()
      },
    })

    statewideHazards.value = nextPayload.hazards
    lastUpdatedAt.value = nextPayload.fetchedAt || nextPayload.cachedAt || new Date()
  } catch (error) {
    if (error?.name === 'AbortError') return
    console.error('Failed to load statewide realtime hazards:', error)
  }
}

function selectHazard(hazard) {
  selectedHazardId.value = hazard.id
  isSheetExpanded.value = true
  mapInstance?.setView(hazard.coordinates, Math.max(mapInstance.getZoom(), 9), { animate: true })
}

function openLocationDetail(hazard) {
  if (!hazard) return
  selectedHazardId.value = hazard.id

  router.push({
    name: 'location-detail',
    params: { id: hazard.id },
    query: {
      title: hazard.title,
      type: hazard.type,
      severity: hazard.severity,
      category: hazard.type === 'other' ? 'Other' : (hazard.riskCategory || ''),
      source: hazard.source,
      updatedAt: hazard.updatedAt || '',
      lat: String(hazard.coordinates?.[0] ?? ''),
      lng: String(hazard.coordinates?.[1] ?? ''),
      description: hazard.description || '',
    },
  })
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

function switchMapStyle(styleId) {
  if (!mapInstance || !MAP_VISUAL_STYLES[styleId] || selectedMapStyle.value === styleId) return
  selectedMapStyle.value = styleId
  if (baseTileLayer) mapInstance.removeLayer(baseTileLayer)
  baseTileLayer = createLeafletBaseLayer(L, styleId).addTo(mapInstance)
  if (markersLayer) markersLayer.bringToFront()
  if (userLocationLayer) userLocationLayer.bringToFront()
}

function recenterMap() {
  isViewingUserLocation.value = false
  mapInstance?.flyTo(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { duration: 0.55 })
}

function renderUserLocation(point) {
  if (!userLocationLayer) return
  userLocationLayer.clearLayers()

  L.circleMarker([point.lat, point.lng], {
    radius: 8,
    color: '#ffffff',
    fillColor: '#173b31',
    fillOpacity: 1,
    weight: 3,
  }).bindPopup('Your current location', { className: 'hs-map-popup' }).addTo(userLocationLayer)

  L.circle([point.lat, point.lng], {
    radius: Math.max(point.accuracy || 0, 80),
    color: '#173b31',
    fillColor: '#173b31',
    fillOpacity: 0.08,
    opacity: 0.24,
    weight: 1,
    interactive: false,
  }).addTo(userLocationLayer)
}

function locateUser() {
  if (isViewingUserLocation.value) {
    recenterMap()
    return
  }

  if (!navigator.geolocation || isLocatingUser.value) return
  isLocatingUser.value = true

  navigator.geolocation.getCurrentPosition(
    (position) => {
      isLocatingUser.value = false
      const point = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
        accuracy: position.coords.accuracy,
      }

      if (!isLatLngInVictoria(L.latLng(point.lat, point.lng))) {
        window.alert('Your current location is outside Victoria, so it cannot be shown on this map.')
        return
      }

      renderUserLocation(point)
      isViewingUserLocation.value = true
      mapInstance?.flyTo([point.lat, point.lng], Math.max(mapInstance.getZoom(), 13), { duration: 0.65 })
    },
    () => {
      isLocatingUser.value = false
      window.alert('Unable to access your current location. Please allow location access in your browser.')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  )
}

onMounted(async () => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
    fadeAnimation: false,
    markerZoomAnimation: false,
    zoomAnimation: false,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { animate: false })
  applyVictoriaMapConstraints(mapInstance)

  mapInstance.attributionControl.setPrefix(false)

  baseTileLayer = createLeafletBaseLayer(L, selectedMapStyle.value).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)
  userLocationLayer = L.layerGroup().addTo(mapInstance)

  await Promise.all([loadHazards(), loadStatewideHazards()])
  refreshTimer = window.setInterval(() => {
    loadHazards()
    loadStatewideHazards()
  }, REFRESH_EVERY_MS)
  mapInstance.on('moveend', loadHazards)
})

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (inflightController) inflightController.abort()
  if (statewideInflightController) statewideInflightController.abort()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

watch(filteredHazards, () => {
  if (!filteredHazards.value.some((hazard) => hazard.id === selectedHazardId.value)) {
    selectedHazardId.value = ''
  }
  renderMarkers()
}, { deep: true })
</script>

<template>
  <div class="risk-map-page">
    <aside class="risk-map-sidebar mobile-sheet" :class="{ 'mobile-sheet--expanded': isSheetExpanded }">
      <div class="mobile-sheet__handle"></div>
      <div class="risk-map-mobile-actions">
        <button class="mobile-sheet-toggle" @click="toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ isSheetExpanded ? 'expand_more' : 'expand_less' }}</span>
          {{ isSheetExpanded ? 'Show Less' : 'Open Feed' }}
        </button>
      </div>
      <div class="mobile-sheet__body risk-map-sidebar__body">
      <div>
        <p class="risk-map-kicker">Real-time Victoria Risk Map</p>
        <h1 class="risk-map-title">Official Open Data Monitoring</h1>
      </div>

      <div class="risk-map-layers">
        <p class="risk-map-block-title">Hazard Layers</p>
        <div class="risk-map-layer-list">
          <div
            v-for="(meta, layerId) in layerMeta"
            :key="layerId"
            class="risk-map-layer-btn risk-map-layer-btn--active"
          >
            <span class="risk-map-layer-dot" :style="{ background: meta.color }"></span>
            <span>{{ meta.label }}</span>
          </div>
        </div>
      </div>

      <div class="risk-map-summary">
        <p class="risk-map-block-title">Statewide Summary</p>
        <p class="risk-map-subline">
          {{ statewideHazards.length }} events across Victoria
        </p>
        <p class="risk-map-subline">
          Extreme {{ statewideStats.extreme }} · High {{ statewideStats.high }} · Moderate {{ statewideStats.moderate }} · Low {{ statewideStats.low }}
        </p>
        <p class="risk-map-subline">
          Visible on map: {{ filteredHazards.length }}
        </p>
        
        <p class="risk-map-subline">
          Last update: {{ lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : '—' }}
        </p>
      </div>

      <div class="risk-map-feed">
        <p class="risk-map-block-title">Visible Feed</p>
        <div class="risk-map-feed-list">
          <button
            v-for="hazard in filteredHazards"
            :key="hazard.id"
            class="risk-map-feed-item"
            :class="{ 'risk-map-feed-item--active': selectedHazardId === hazard.id }"
            @click="openLocationDetail(hazard)"
          >
            <span class="risk-map-feed-severity">{{ severityLabel[hazard.severity] || 'Low' }}</span>
            <strong>{{ hazard.title }}</strong>
            <small>{{ hazard.type === 'other' ? 'Other' : (hazard.riskCategory || layerMeta[hazard.type]?.label || 'Unspecified') }} · {{ hazard.source }}</small>
          </button>
        </div>
      </div>
      </div>
    </aside>

    <main class="risk-map-canvas-wrap">
      <div ref="mapElement" class="risk-map-canvas"></div>
      <div class="risk-map-map-status">
        <span class="material-symbols-outlined" aria-hidden="true">radar</span>
        <strong>{{ statewideHazards.length }}</strong>
        <span>statewide hazards</span>
      </div>
      <div class="risk-map-map-controls">
        <button class="risk-map-control-btn" type="button" aria-label="Zoom in" title="Zoom in" @click="mapInstance?.zoomIn()">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>
        </button>
        <button class="risk-map-control-btn" type="button" aria-label="Zoom out" title="Zoom out" @click="mapInstance?.zoomOut()">
          <span class="material-symbols-outlined" aria-hidden="true">remove</span>
        </button>
        <button
          class="risk-map-control-btn"
          type="button"
          :aria-label="isViewingUserLocation ? 'Return to Victoria map' : 'Go to my location'"
          :title="isViewingUserLocation ? 'Return to Victoria map' : 'Go to my location'"
          :disabled="isLocatingUser"
          @click="locateUser"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ isViewingUserLocation ? 'public' : 'my_location' }}</span>
        </button>
      </div>
      <div class="risk-map-style-switcher" aria-label="Map style">
        <button
          v-for="(style, styleId) in MAP_VISUAL_STYLES"
          :key="styleId"
          type="button"
          class="risk-map-style-btn"
          :class="{ 'risk-map-style-btn--active': selectedMapStyle === styleId }"
          @click="switchMapStyle(styleId)"
        >
          {{ style.shortLabel }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.risk-map-page {
  display: grid;
  grid-template-columns: minmax(360px, 390px) 1fr;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background:
    radial-gradient(circle at 0% 0%, rgba(143, 174, 131, 0.26), transparent 24rem),
    linear-gradient(140deg, #fffaf2 0%, #f4efe6 46%, #e7eee4 100%);
  overflow: hidden;
  position: relative;
}

.risk-map-sidebar {
  --mobile-sheet-peek: 240px;
  padding: 1.2rem;
  border-right: 1px solid rgba(33, 72, 59, 0.14);
  background: rgba(255, 250, 242, 0.84);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  min-height: 0;
}

.risk-map-sidebar__body {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.risk-map-mobile-actions {
  display: none;
}

.risk-map-kicker {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 900;
  color: #6f897b;
}

.risk-map-title {
  margin-top: 0.35rem;
  font-size: 2rem;
  line-height: 1;
  font-weight: 700;
  color: #173b31;
}

.risk-map-subtitle {
  margin-top: 0.45rem;
  font-size: 0.86rem;
  color: #4f625f;
  line-height: 1.45;
}

.risk-map-layers,
.risk-map-filters,
.risk-map-summary,
.risk-map-feed {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.95rem;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.015), 0 2px 8px rgba(0,0,0,0.035), 0 12px 28px rgba(25,56,45,0.06);
}

.risk-map-block-title {
  font-size: 0.73rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #536f63;
}

.risk-map-layer-list {
  margin-top: 0.7rem;
  display: grid;
  gap: 0.45rem;
}

.risk-map-layer-btn {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(33, 72, 59, 0.12);
  padding: 0.48rem 0.62rem;
  font-size: 0.8rem;
  color: #3b4f49;
  background: #fffaf2;
}

.risk-map-layer-btn--active {
  border-color: rgba(33, 72, 59, 0.26);
  background: #f4f8f1;
  font-weight: 700;
}

.risk-map-layer-btn--dynamic {
  justify-content: space-between;
  background: #fbfdfc;
}

.risk-map-layer-btn--dynamic small {
  font-size: 0.72rem;
  color: #567069;
  font-weight: 700;
}

.risk-map-layer-dot {
  width: 0.66rem;
  height: 0.66rem;
  border-radius: 999px;
}

.risk-map-subline {
  margin-top: 0.55rem;
  font-size: 0.8rem;
  color: #48605a;
}

.risk-map-filter-label {
  display: block;
  margin-top: 0.65rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #557168;
}

.risk-map-time-select {
  width: 100%;
  margin-top: 0.35rem;
  border: 1px solid #d6e3db;
  border-radius: 0.5rem;
  background: #fcfefd;
  color: #304740;
  font-size: 0.8rem;
  padding: 0.46rem 0.55rem;
}

.risk-map-risk-level-list {
  margin-top: 0.35rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.38rem;
}

.risk-map-risk-level-btn {
  border: 1px solid #d8e1d7;
  border-radius: 0.5rem;
  background: #fcfefd;
  color: #3b4f49;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.4rem 0.5rem;
}

.risk-map-risk-level-btn--active {
  border-color: #8eb39d;
  background: #edf6f0;
  color: #21453a;
}


.risk-map-feed-list {
  margin-top: 0.6rem;
  display: grid;
  gap: 0.55rem;
  max-height: 33vh;
  overflow: auto;
  padding-right: 0.2rem;
}

.risk-map-feed-item {
  text-align: left;
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 0.9rem;
  padding: 0.72rem;
  background: #ffffff;
  display: grid;
  gap: 0.2rem;
  font-size: 0.78rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.risk-map-feed-item:hover {
  transform: translateY(-1px);
  border-color: rgba(33, 72, 59, 0.24);
  box-shadow: 0 10px 22px rgba(25, 56, 45, 0.08);
}

.risk-map-feed-item--active {
  border-color: rgba(33, 72, 59, 0.34);
  background: #f4f8f1;
}

.risk-map-feed-severity {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4f7061;
  font-weight: 800;
}

.risk-map-feed-item strong {
  color: #1b3832;
}

.risk-map-feed-item small {
  color: #5f6c67;
}

.risk-map-canvas-wrap {
  position: relative;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  padding: 0.9rem;
  background:
    linear-gradient(135deg, rgba(23, 59, 49, 0.18), rgba(143, 174, 131, 0.12)),
    #dfe8dd;
}

.risk-map-canvas {
  height: 100%;
  width: 100%;
  overflow: hidden;
  border-radius: 1.15rem;
  background: #dfe8dd;
  box-shadow: inset 0 0 0 1px rgba(33, 72, 59, 0.1), 0 24px 70px rgba(23, 59, 49, 0.18);
}

.risk-map-canvas::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 250, 242, 0.45);
}

.risk-map-map-status {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid rgba(33, 72, 59, 0.16);
  border-radius: 999px;
  padding: 0.5rem 0.72rem;
  background: rgba(255, 250, 242, 0.9);
  color: #173b31;
  box-shadow: 0 14px 34px rgba(23, 59, 49, 0.14);
  backdrop-filter: blur(14px);
}

.risk-map-map-status .material-symbols-outlined {
  font-size: 1.05rem;
  color: #2f604e;
}

.risk-map-map-status strong,
.risk-map-map-status span:last-child {
  font-size: 0.78rem;
  font-weight: 850;
}

.risk-map-map-controls {
  position: absolute;
  right: 1.25rem;
  top: 1.25rem;
  display: grid;
  gap: 0.45rem;
  z-index: 500;
}

.risk-map-control-btn {
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 999px;
  border: 1px solid rgba(33, 72, 59, 0.14);
  background: rgba(255, 250, 242, 0.94);
  color: #173b31;
  display: grid;
  place-items: center;
  box-shadow: 0 12px 26px rgba(24, 63, 50, 0.15);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.risk-map-control-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(33, 72, 59, 0.28);
  background: #fffaf2;
}

.risk-map-control-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.risk-map-control-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

.risk-map-style-switcher {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 500;
  display: inline-flex;
  gap: 0.3rem;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 999px;
  padding: 0.25rem;
  background: rgba(255, 250, 242, 0.92);
  box-shadow: 0 14px 34px rgba(24, 63, 50, 0.14);
  backdrop-filter: blur(14px);
}

.risk-map-style-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.42rem 0.68rem;
  background: transparent;
  color: #405a51;
  font-size: 0.72rem;
  font-weight: 850;
}

.risk-map-style-btn--active {
  background: #173b31;
  color: #fffaf2;
  box-shadow: 0 8px 18px rgba(23, 59, 49, 0.22);
}

.risk-map-canvas :deep(.leaflet-control-attribution) {
  font-size: 10px;
  line-height: 1.15;
  color: rgba(34, 58, 51, 0.48);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 6px 0 0 0;
  padding: 2px 6px;
  transition: all 0.22s ease;
}

.risk-map-canvas :deep(.leaflet-control-attribution:hover) {
  color: rgba(34, 58, 51, 0.8);
  background: rgba(255, 255, 255, 0.78);
}

.risk-map-canvas :deep(.leaflet-control-attribution a) {
  color: inherit;
}

.risk-map-canvas :deep(.hs-map-popup .leaflet-popup-content-wrapper) {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.9rem;
  background: rgba(255, 250, 242, 0.96);
  color: #173b31;
  box-shadow: 0 18px 44px rgba(23, 59, 49, 0.18);
  backdrop-filter: blur(14px);
}

.risk-map-canvas :deep(.hs-map-popup .leaflet-popup-content) {
  margin: 0.85rem;
}

.risk-map-canvas :deep(.hs-map-popup .leaflet-popup-tip) {
  background: rgba(255, 250, 242, 0.96);
}

@media (max-width: 1024px) {
  .risk-map-page {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .risk-map-sidebar {
    border-right: none;
    border-top: 1px solid rgba(33, 72, 59, 0.14);
    padding: 0 1rem 1rem;
    background: rgba(255, 250, 242, 0.96);
  }

  .risk-map-feed-list {
    max-height: none;
  }

  .risk-map-canvas-wrap {
    height: 100%;
    min-height: var(--mobile-safe-height);
  }

  .risk-map-map-status {
    top: 1.15rem;
    left: 1.15rem;
    max-width: calc(100% - 6rem);
  }

  .risk-map-style-switcher {
    right: 1.15rem;
    bottom: calc(var(--mobile-sheet-peek, 240px) + 1rem);
  }

  .risk-map-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.5rem;
  }
}
</style>
