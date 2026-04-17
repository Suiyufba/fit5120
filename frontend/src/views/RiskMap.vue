<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  applyVictoriaMapConstraints,
  getMapBboxWithinVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'

const REFRESH_EVERY_MS = 60_000
const router = useRouter()

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
}

const mapElement = ref(null)
const selectedHazardId = ref('')
const hazards = ref([])
const loading = ref(false)
const lastUpdatedAt = ref(null)
const isSheetExpanded = ref(false)

const severityOrder = { extreme: 4, high: 3, moderate: 2, low: 1 }
const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }

const filteredHazards = computed(() => {
  return hazards.value
    .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
})

const mapStats = computed(() => {
  const stats = { extreme: 0, high: 0, moderate: 0, low: 0 }
  filteredHazards.value.forEach((hazard) => {
    if (stats[hazard.severity] !== undefined) stats[hazard.severity] += 1
  })
  return stats
})

let mapInstance
let markersLayer
let refreshTimer
let inflightController

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
  return layerMeta[hazard?.type] || layerMeta.trail
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
          Category: ${escapeHtml(hazard.riskCategory || meta.label || 'Unspecified')}<br />
          Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
          Source: ${escapeHtml(hazard.source)}
        </div>
      </div>
      `
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
      layers: ['fire', 'flood', 'storm', 'heat', 'trail'],
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
      category: hazard.riskCategory || '',
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

onMounted(async () => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom)
  applyVictoriaMapConstraints(mapInstance)

  mapInstance.attributionControl.setPrefix(false)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)

  await loadHazards()
  refreshTimer = window.setInterval(loadHazards, REFRESH_EVERY_MS)
  mapInstance.on('moveend', loadHazards)
})

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (inflightController) inflightController.abort()
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
        <p class="risk-map-block-title">Current Summary</p>
        <p class="risk-map-subline">
          {{ filteredHazards.length }} events · Extreme {{ mapStats.extreme }} · High {{ mapStats.high }} · Moderate {{ mapStats.moderate }} · Low {{ mapStats.low }}
        </p>
        <p class="risk-map-subline">Counting method: same as Plan Route map (same bbox and layer scope).</p>
        <p class="risk-map-subline">Coverage zones: L1 ≤1km · L2 1–3km · L3 3–5km</p>
        <p class="risk-map-subline">
          Last update: {{ lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : '—' }}
        </p>
      </div>

      <div class="risk-map-feed">
        <p class="risk-map-block-title">Live Feed</p>
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
            <small>{{ hazard.riskCategory || layerMeta[hazard.type]?.label || 'Unspecified' }} · {{ hazard.source }}</small>
          </button>
        </div>
      </div>
      </div>
    </aside>

    <main class="risk-map-canvas-wrap">
      <div ref="mapElement" class="risk-map-canvas"></div>
      <div class="risk-map-map-controls">
        <button class="risk-map-control-btn" @click="mapInstance?.zoomIn()">+</button>
        <button class="risk-map-control-btn" @click="mapInstance?.zoomOut()">−</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.risk-map-page {
  display: grid;
  grid-template-columns: 360px 1fr;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background: linear-gradient(140deg, #f5fbf5 0%, #e7f2fb 46%, #f6f3ef 100%);
  overflow: hidden;
  position: relative;
}

.risk-map-sidebar {
  --mobile-sheet-peek: 240px;
  padding: 1.4rem;
  border-right: 1px solid #d7e2d9;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(7px);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  min-height: 0;
}

.risk-map-sidebar__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.risk-map-mobile-actions {
  display: none;
}

.risk-map-kicker {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #3a6f65;
}

.risk-map-title {
  font-size: 1.55rem;
  line-height: 1.2;
  font-weight: 800;
  color: #1c3832;
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
  background: #ffffff;
  border: 1px solid #dfe7df;
  border-radius: 0.85rem;
  padding: 0.85rem;
}

.risk-map-block-title {
  font-size: 0.73rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #3f6355;
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
  border-radius: 0.55rem;
  border: 1px solid #d8e1d7;
  padding: 0.44rem 0.55rem;
  font-size: 0.8rem;
  color: #3b4f49;
  background: #fdfdfd;
}

.risk-map-layer-btn--active {
  border-color: #8eb39d;
  background: #edf6f0;
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
  gap: 0.5rem;
  max-height: 33vh;
  overflow: auto;
  padding-right: 0.2rem;
}

.risk-map-feed-item {
  text-align: left;
  border: 1px solid #e0e7e0;
  border-radius: 0.55rem;
  padding: 0.55rem;
  background: #fefefe;
  display: grid;
  gap: 0.2rem;
  font-size: 0.78rem;
}

.risk-map-feed-item--active {
  border-color: #90b9a5;
  background: #eff8f2;
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
}

.risk-map-canvas {
  height: 100%;
  width: 100%;
}

.risk-map-map-controls {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  display: grid;
  gap: 0.4rem;
  z-index: 500;
}

.risk-map-control-btn {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  border: 1px solid #cddccb;
  background: rgba(255, 255, 255, 0.94);
  color: #1b3832;
  font-size: 1.2rem;
  font-weight: 800;
  box-shadow: 0 4px 16px rgba(24, 63, 50, 0.12);
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

@media (max-width: 1024px) {
  .risk-map-page {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .risk-map-sidebar {
    border-right: none;
    border-top: 1px solid #d7e2d9;
    padding: 0 1rem 1rem;
    background: rgba(255, 255, 255, 0.96);
  }

  .risk-map-feed-list {
    max-height: none;
  }

  .risk-map-canvas-wrap {
    height: 100%;
    min-height: var(--mobile-safe-height);
  }

  .risk-map-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.5rem;
  }
}
</style>
