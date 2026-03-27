<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards, getHazardApiConfig } from '../services/hazardApi'

const VICTORIA_VIEW = {
  center: [-37.8136, 144.9631],
  zoom: 7,
}

const REFRESH_EVERY_MS = 60_000

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const mockHazards = [
  {
    id: 'mock-1',
    type: 'fire',
    severity: 'high',
    title: 'Smoke near Apollo Bay',
    description: 'Visibility reduced on selected tracks. Avoid non-essential travel.',
    source: 'VicEmergency (Mock Fallback)',
    sourceUrl: 'https://emergency.vic.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-38.7547, 143.6693],
  },
  {
    id: 'mock-2',
    type: 'flood',
    severity: 'moderate',
    title: 'Flash flood warning in Gippsland',
    description: 'Creek crossings may become unsafe after intense rainfall.',
    source: 'BOM Warnings (Mock Fallback)',
    sourceUrl: 'https://www.bom.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-37.8524, 146.3936],
  },
  {
    id: 'mock-3',
    type: 'heat',
    severity: 'high',
    title: 'Extreme heat in Mallee district',
    description: 'Heat stress risk elevated for daytime hiking windows.',
    source: 'Vic Open Data (Mock Fallback)',
    sourceUrl: 'https://discover.data.vic.gov.au/',
    updatedAt: new Date().toISOString(),
    coordinates: [-35.9063, 142.3323],
  },
]

const mapElement = ref(null)
const selectedHazardId = ref('')
const activeLayers = ref(['fire', 'flood', 'storm', 'heat'])
const hazards = ref([])
const loading = ref(false)
const errorMessage = ref('')
const lastUpdatedAt = ref(null)
const usingFallback = ref(false)

const severityOrder = { extreme: 4, high: 3, moderate: 2, low: 1 }
const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }

const apiConfig = getHazardApiConfig()
const mapStatus = computed(() => {
  if (errorMessage.value) return 'error'
  if (loading.value) return 'loading'
  return 'ready'
})

const filteredHazards = computed(() => {
  return hazards.value
    .filter((hazard) => activeLayers.value.includes(hazard.type))
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

function toggleLayer(layerId) {
  if (activeLayers.value.includes(layerId)) {
    activeLayers.value = activeLayers.value.filter((item) => item !== layerId)
    return
  }

  activeLayers.value = [...activeLayers.value, layerId]
}

function getMarkerRadius(severity) {
  if (severity === 'extreme') return 12
  if (severity === 'high') return 10
  if (severity === 'moderate') return 8
  return 6
}

function renderMarkers() {
  if (!markersLayer) return
  markersLayer.clearLayers()

  filteredHazards.value.forEach((hazard) => {
    const meta = layerMeta[hazard.type] || layerMeta.other
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
        <div style="font-weight: 800; margin-bottom: 6px;">${hazard.title}</div>
        <div style="font-size: 12px; margin-bottom: 8px;">${hazard.description}</div>
        <div style="font-size: 11px; color: #5f6b66;">
          ${meta.label} · ${severityLabel[hazard.severity] || 'Unknown'}<br />
          Source: ${hazard.source}
        </div>
      </div>
      `
    )

    marker.on('click', () => {
      selectedHazardId.value = hazard.id
    })

    marker.addTo(markersLayer)
  })
}

async function loadHazards() {
  if (inflightController) inflightController.abort()
  inflightController = new AbortController()
  loading.value = true
  errorMessage.value = ''

  try {
    const mapBounds = mapInstance?.getBounds()
    const bbox = mapBounds
      ? [
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth(),
        ]
      : undefined

    const nextHazards = await fetchRealtimeHazards({
      bbox,
      layers: activeLayers.value,
      signal: inflightController.signal,
    })

    hazards.value = nextHazards
    usingFallback.value = false
    lastUpdatedAt.value = new Date()
  } catch (error) {
    if (error?.name === 'AbortError') return
    hazards.value = mockHazards
    usingFallback.value = true
    errorMessage.value = 'Realtime API unavailable. Showing fallback sample data.'
    lastUpdatedAt.value = new Date()
  } finally {
    loading.value = false
  }
}

function selectHazard(hazard) {
  selectedHazardId.value = hazard.id
  mapInstance?.setView(hazard.coordinates, Math.max(mapInstance.getZoom(), 9), { animate: true })
}

onMounted(async () => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)

  await loadHazards()
  refreshTimer = window.setInterval(loadHazards, REFRESH_EVERY_MS)
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
  renderMarkers()
}, { deep: true })
</script>

<template>
  <div class="risk-map-page">
    <aside class="risk-map-sidebar">
      <div>
        <p class="risk-map-kicker">Real-time Victoria Risk Map</p>
        <h1 class="risk-map-title">Official Open Data Monitoring</h1>
        <p class="risk-map-subtitle">
          前端已接入实时接口轮询能力（60秒刷新），后续只需后端聚合官方数据源即可上线。
        </p>
      </div>

      <div class="risk-map-status-grid">
        <div class="risk-map-status-card">
          <p class="risk-map-status-label">API Endpoint</p>
          <p class="risk-map-status-value">{{ apiConfig.realtimeEndpoint }}</p>
        </div>
        <div class="risk-map-status-card">
          <p class="risk-map-status-label">Sync Status</p>
          <p class="risk-map-status-value">
            <span v-if="mapStatus === 'loading'">Syncing...</span>
            <span v-else-if="mapStatus === 'error'">Fallback Mode</span>
            <span v-else>Live</span>
          </p>
        </div>
      </div>

      <div class="risk-map-layers">
        <p class="risk-map-block-title">Hazard Layers</p>
        <div class="risk-map-layer-list">
          <button
            v-for="(meta, layerId) in layerMeta"
            :key="layerId"
            class="risk-map-layer-btn"
            :class="{ 'risk-map-layer-btn--active': activeLayers.includes(layerId) }"
            @click="toggleLayer(layerId)"
          >
            <span class="risk-map-layer-dot" :style="{ background: meta.color }"></span>
            <span>{{ meta.label }}</span>
          </button>
        </div>
      </div>

      <div class="risk-map-summary">
        <p class="risk-map-block-title">Current Summary</p>
        <p class="risk-map-subline">
          {{ filteredHazards.length }} events · Extreme {{ mapStats.extreme }} · High {{ mapStats.high }} · Moderate {{ mapStats.moderate }}
        </p>
        <p class="risk-map-subline">
          Last update: {{ lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : '—' }}
        </p>
        <p v-if="usingFallback" class="risk-map-fallback">
          {{ errorMessage }}
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
            @click="selectHazard(hazard)"
          >
            <span class="risk-map-feed-severity">{{ severityLabel[hazard.severity] || 'Low' }}</span>
            <strong>{{ hazard.title }}</strong>
            <small>{{ hazard.source }}</small>
          </button>
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
  min-height: calc(100vh - 72px);
  background: linear-gradient(140deg, #f5fbf5 0%, #e7f2fb 46%, #f6f3ef 100%);
}

.risk-map-sidebar {
  padding: 1.4rem;
  border-right: 1px solid #d7e2d9;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(7px);
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.risk-map-status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.risk-map-status-card {
  background: #f8fbf8;
  border: 1px solid #dfe7df;
  border-radius: 0.75rem;
  padding: 0.7rem;
}

.risk-map-status-label {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #65817a;
}

.risk-map-status-value {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  color: #29423c;
  font-weight: 700;
  word-break: break-word;
}

.risk-map-layers,
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

.risk-map-fallback {
  margin-top: 0.55rem;
  font-size: 0.74rem;
  color: #8f3f2e;
  background: #fff6f1;
  border: 1px solid #f2d5c6;
  border-radius: 0.45rem;
  padding: 0.4rem 0.45rem;
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
}

.risk-map-canvas {
  height: calc(100vh - 72px);
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

@media (max-width: 1024px) {
  .risk-map-page {
    grid-template-columns: 1fr;
  }

  .risk-map-sidebar {
    border-right: none;
    border-bottom: 1px solid #d7e2d9;
  }

  .risk-map-feed-list {
    max-height: 24vh;
  }
}
</style>
