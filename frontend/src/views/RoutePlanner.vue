<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuthState } from '../services/authStore'
import { planSafeRoute } from '../services/routeApi'
import { setLatestRoutePlan } from '../services/routePlanStore'

const router = useRouter()
const { state: authState } = useAuthState()
const mapElement = ref(null)
const loading = ref(false)
const error = ref('')
const startPoint = ref(null)
const endPoint = ref(null)
const planResult = ref(null)

let mapInstance
let markerLayer
let routeLayer
let inflightController

const canPlan = computed(() => Boolean(startPoint.value && endPoint.value && !loading.value))

const summary = computed(() => {
  if (!planResult.value?.recommendedRoute) return null
  const route = planResult.value.recommendedRoute
  return {
    distance: `${route.distanceKm.toFixed(1)} km`,
    duration: `${Math.round(route.durationMin)} min`,
    difficulty: route.difficulty,
    risk: `${route.riskLevel} (${route.riskScore.toFixed(1)})`,
    goNoGo: route.goNoGo,
    explanation: route.explanation,
    zoneSummary: route.zoneSummary || { level1Count: 0, level2Count: 0, level3Count: 0 }
  }
})

function renderMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()

  if (startPoint.value) {
    L.circleMarker([startPoint.value.lat, startPoint.value.lng], {
      radius: 8,
      color: '#1F6E57',
      fillColor: '#2E9D7A',
      fillOpacity: 0.9,
      weight: 2,
    }).bindPopup('Start point').addTo(markerLayer)
  }

  if (endPoint.value) {
    L.circleMarker([endPoint.value.lat, endPoint.value.lng], {
      radius: 8,
      color: '#A6382A',
      fillColor: '#D84727',
      fillOpacity: 0.9,
      weight: 2,
    }).bindPopup('Destination').addTo(markerLayer)
  }
}

function drawRoutes() {
  if (!routeLayer) return
  routeLayer.clearLayers()

  const recommended = planResult.value?.recommendedRoute
  const alternatives = planResult.value?.alternatives || []

  if (recommended?.geometry?.length) {
    L.polyline(recommended.geometry, {
      color: '#1F6E57',
      weight: 6,
      opacity: 0.9,
    }).addTo(routeLayer)
  }

  alternatives.forEach((alt) => {
    if (!Array.isArray(alt.geometry) || alt.geometry.length < 2) return
    L.polyline(alt.geometry, {
      color: '#5f6b66',
      weight: 4,
      opacity: 0.45,
      dashArray: '8 8',
    }).addTo(routeLayer)
  })

  if (recommended?.geometry?.length) {
    const bounds = L.latLngBounds(recommended.geometry)
    mapInstance.fitBounds(bounds.pad(0.2))
  }
}

function resetSelection() {
  startPoint.value = null
  endPoint.value = null
  error.value = ''
  planResult.value = null
  setLatestRoutePlan(null)
  renderMarkers()
  drawRoutes()
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
      token: authState.token,
      signal: inflightController.signal,
    })

    planResult.value = payload

    setLatestRoutePlan({
      ...payload,
      start: startPoint.value,
      end: endPoint.value,
    })

    drawRoutes()
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    error.value = nextError.message || 'Failed to generate a safe route'
  } finally {
    loading.value = false
  }
}

function goToDetails() {
  if (!planResult.value?.recommendedRoute) return
  router.push('/route-detail')
}

onMounted(() => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView([-37.8136, 144.9631], 7)

  mapInstance.attributionControl.setPrefix(false)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  markerLayer = L.layerGroup().addTo(mapInstance)
  routeLayer = L.layerGroup().addTo(mapInstance)

  mapInstance.on('click', (event) => {
    const point = {
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6)),
    }

    if (!startPoint.value) {
      startPoint.value = point
      renderMarkers()
      return
    }

    if (!endPoint.value) {
      endPoint.value = point
      renderMarkers()
      return
    }

    startPoint.value = endPoint.value
    endPoint.value = point
    planResult.value = null
    error.value = ''
    renderMarkers()
    drawRoutes()
  })
})

onUnmounted(() => {
  if (inflightController) inflightController.abort()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <main class="planner-layout">
    <aside class="planner-panel">
      <div>
        <p class="planner-kicker">Pre-Hike Safety Planner</p>
        <h1>Plan Route</h1>
        <p class="planner-sub">Click map to set start and destination. Route safety is personalized by your level.</p>
      </div>

      <div class="planner-points">
        <div class="point-card">
          <p>Start</p>
          <strong>{{ startPoint ? `${startPoint.lat}, ${startPoint.lng}` : 'Click map to set start point' }}</strong>
        </div>
        <div class="point-card">
          <p>Destination</p>
          <strong>{{ endPoint ? `${endPoint.lat}, ${endPoint.lng}` : 'Click map to set destination' }}</strong>
        </div>
      </div>

      <div class="planner-actions">
        <button class="primary-btn" :disabled="!canPlan" @click="handlePlanRoute">
          {{ loading ? 'Planning...' : 'Plan Safe Route' }}
        </button>
        <button class="ghost-btn" @click="resetSelection">Reset Points</button>
      </div>

      <p v-if="error" class="planner-error">{{ error }}</p>

      <section v-if="summary" class="planner-summary">
        <p class="summary-kicker">Recommended Safer Route</p>
        <div class="summary-grid">
          <article><span>Distance</span><strong>{{ summary.distance }}</strong></article>
          <article><span>Duration</span><strong>{{ summary.duration }}</strong></article>
          <article><span>Difficulty</span><strong>{{ summary.difficulty }}</strong></article>
          <article><span>Risk</span><strong>{{ summary.risk }}</strong></article>
        </div>

        <div class="go-tag" :class="{ 'go-tag--danger': summary.goNoGo === 'No-Go' }">
          {{ summary.goNoGo }}
        </div>
        <p class="zone-inline">
          Route crosses zones: L1 {{ summary.zoneSummary.level1Count }} ·
          L2 {{ summary.zoneSummary.level2Count }} ·
          L3 {{ summary.zoneSummary.level3Count }}
        </p>
        <p class="summary-explain">{{ summary.explanation }}</p>
        <button class="primary-btn" @click="goToDetails">View Route Details</button>
      </section>
    </aside>

    <section class="planner-map-wrap">
      <div ref="mapElement" class="planner-map"></div>
    </section>
  </main>
</template>

<style scoped>
.planner-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  height: calc(100vh - 72px);
  background: linear-gradient(130deg, #f3f8f5 0%, #e6f2ee 45%, #eef4fb 100%);
}

.planner-panel {
  border-right: 1px solid #d8e3dc;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(7px);
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  overflow: auto;
}

.planner-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #40695c;
  font-weight: 700;
}

h1 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1d3932;
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
  border: 1px solid #dbe5de;
  border-radius: 0.7rem;
  padding: 0.7rem;
  background: #fcfffd;
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
  margin-top: 0.3rem;
  color: #213e37;
  font-size: 0.86rem;
  word-break: break-word;
}

.planner-actions {
  display: grid;
  gap: 0.5rem;
}

.primary-btn,
.ghost-btn {
  border: 0;
  border-radius: 0.65rem;
  padding: 0.72rem 0.82rem;
  font-weight: 700;
}

.primary-btn {
  background: #2e7d6b;
  color: #fff;
}

.primary-btn:disabled {
  opacity: 0.6;
}

.ghost-btn {
  border: 1px solid #bfd1c8;
  background: #fff;
  color: #2f5448;
}

.planner-error {
  background: #fff1ef;
  border: 1px solid #e9b7ae;
  color: #7c271f;
  border-radius: 0.65rem;
  padding: 0.58rem;
  font-size: 0.84rem;
}

.planner-summary {
  border: 1px solid #d7e4dc;
  border-radius: 0.8rem;
  background: #ffffff;
  padding: 0.8rem;
  display: grid;
  gap: 0.7rem;
}

.summary-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.67rem;
  color: #3c6558;
  font-weight: 800;
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
  background: #ffe4df;
  color: #8b2a1f;
}

.summary-explain {
  color: #3f5a54;
  font-size: 0.84rem;
  line-height: 1.45;
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
}

.planner-map {
  width: 100%;
  height: 100%;
}

.planner-map :deep(.leaflet-control-attribution) {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.58);
}

@media (max-width: 980px) {
  .planner-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(320px, auto) 1fr;
  }

  .planner-panel {
    border-right: 0;
    border-bottom: 1px solid #d8e3dc;
  }
}
</style>
