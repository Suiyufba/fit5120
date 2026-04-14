<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { restoreLatestRoutePlan, setLatestRoutePlan } from '../services/routePlanStore'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { useAuthState } from '../services/authStore'
import { planSafeRoute } from '../services/routeApi'

const router = useRouter()
const route = useRoute()
const { state: authState } = useAuthState()
const mapElement = ref(null)
const plan = ref(null)
const planningFromShare = ref(false)
const shareMessage = ref('')
const shareError = ref('')
const isSheetExpanded = ref(false)

let mapInstance
let routeLayer
let hazardLayer
let hazardInflightController
let hazardRefreshTimer

const hazards = ref([])

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const recommended = computed(() => plan.value?.recommendedRoute || null)
const prepTips = computed(() => recommended.value?.suggestedPrep || [])
const geography = computed(() => recommended.value?.geographyProfile || null)

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
    }).bindPopup(`${hazard.title}<br/>${meta.label} · ${hazard.severity}`).addTo(hazardLayer)
  })
}

async function loadHazards() {
  if (!mapInstance) return
  if (hazardInflightController) hazardInflightController.abort()
  hazardInflightController = new AbortController()

  try {
    const bounds = mapInstance.getBounds()
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    const payload = await fetchRealtimeHazards({
      bbox,
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: hazardInflightController.signal,
    })
    hazards.value = payload.hazards
    drawHazards()
  } catch (error) {
    if (error?.name === 'AbortError') return
    console.error('Failed to load hazards on route detail map:', error)
  }
}

function drawRecommendedRoute() {
  if (!routeLayer || !recommended.value?.geometry?.length) return
  routeLayer.clearLayers()

  L.polyline(recommended.value.geometry, {
    color: '#1F6E57',
    weight: 6,
    opacity: 0.9,
  }).addTo(routeLayer)

  const start = recommended.value.geometry[0]
  const end = recommended.value.geometry[recommended.value.geometry.length - 1]
  L.circleMarker(start, {
    radius: 7,
    color: '#1F6E57',
    fillColor: '#2E9D7A',
    fillOpacity: 0.95,
    weight: 2,
  }).bindPopup('Start').addTo(routeLayer)

  L.circleMarker(end, {
    radius: 7,
    color: '#A6382A',
    fillColor: '#D84727',
    fillOpacity: 0.95,
    weight: 2,
  }).bindPopup('Destination').addTo(routeLayer)

  mapInstance.fitBounds(L.latLngBounds(recommended.value.geometry).pad(0.2))
}

function parseSharedPoint() {
  const asValue = (value) => Array.isArray(value) ? value[0] : value
  const slat = Number(asValue(route.query.slat))
  const slng = Number(asValue(route.query.slng))
  const elat = Number(asValue(route.query.elat))
  const elng = Number(asValue(route.query.elng))

  const allValid = [slat, slng, elat, elng].every((v) => Number.isFinite(v))
  if (!allValid) return null
  return {
    start: { lat: slat, lng: slng },
    end: { lat: elat, lng: elng },
  }
}

function inferStartEndFromPlan() {
  if (plan.value?.start && plan.value?.end) {
    return { start: plan.value.start, end: plan.value.end }
  }

  const geometry = plan.value?.recommendedRoute?.geometry || []
  if (geometry.length < 2) return null
  const start = geometry[0]
  const end = geometry[geometry.length - 1]
  return {
    start: { lat: start[0], lng: start[1] },
    end: { lat: end[0], lng: end[1] },
  }
}

function buildShareUrl() {
  const points = inferStartEndFromPlan()
  if (!points) return ''
  const url = new URL(window.location.origin + '/route-detail')
  url.searchParams.set('slat', String(points.start.lat))
  url.searchParams.set('slng', String(points.start.lng))
  url.searchParams.set('elat', String(points.end.lat))
  url.searchParams.set('elng', String(points.end.lng))
  return url.toString()
}

async function shareRoute() {
  shareError.value = ''
  const shareUrl = buildShareUrl()
  if (!shareUrl) {
    shareError.value = 'No route data available to share yet.'
    return
  }

  const sharePayload = {
    title: 'HikeShield Route Plan',
    text: 'Safer pre-hike route and risk detail',
    url: shareUrl,
  }

  try {
    if (navigator.share) {
      await navigator.share(sharePayload)
      shareMessage.value = 'Route shared successfully.'
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    shareMessage.value = 'Share link copied to clipboard.'
  } catch (error) {
    shareError.value = error?.message || 'Failed to share route.'
  }
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

async function hydrateFromSharedLink() {
  const shared = parseSharedPoint()
  if (!shared) return
  if (!authState.token) {
    shareError.value = 'Sign in to open shared route details.'
    return
  }

  planningFromShare.value = true
  shareError.value = ''
  try {
    const payload = await planSafeRoute({
      start: shared.start,
      end: shared.end,
      token: authState.token,
    })
    const nextPlan = {
      ...payload,
      start: shared.start,
      end: shared.end,
    }
    setLatestRoutePlan(nextPlan)
    plan.value = nextPlan
    drawRecommendedRoute()
  } catch (error) {
    shareError.value = error?.message || 'Failed to load shared route.'
  } finally {
    planningFromShare.value = false
  }
}

onMounted(() => {
  plan.value = restoreLatestRoutePlan()

  mapInstance = L.map(mapElement.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView([-37.8136, 144.9631], 7)

  mapInstance.attributionControl.setPrefix(false)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  routeLayer = L.layerGroup().addTo(mapInstance)
  hazardLayer = L.layerGroup().addTo(mapInstance)
  drawRecommendedRoute()
  loadHazards()
  hazardRefreshTimer = window.setInterval(loadHazards, 60_000)
  mapInstance.on('moveend', loadHazards)
  hydrateFromSharedLink()
})

watch(
  () => [authState.token, route.fullPath],
  () => {
    if (plan.value?.recommendedRoute) return
    hydrateFromSharedLink()
  }
)

onUnmounted(() => {
  if (hazardInflightController) hazardInflightController.abort()
  if (hazardRefreshTimer) window.clearInterval(hazardRefreshTimer)
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <main class="detail-layout">
    <section class="detail-map-wrap">
      <div ref="mapElement" class="detail-map"></div>
    </section>

    <aside class="detail-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': isSheetExpanded }">
      <div class="mobile-sheet__handle"></div>
      <div class="detail-mobile-actions">
        <button class="mobile-sheet-toggle" @click="toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ isSheetExpanded ? 'expand_more' : 'expand_less' }}</span>
          {{ isSheetExpanded ? 'Show Less' : 'Route Detail' }}
        </button>
      </div>
      <div class="mobile-sheet__body detail-panel__body">
      <template v-if="recommended">
        <p class="detail-kicker">Route Safety Detail</p>
        <h1>Recommended Route</h1>
        <p v-if="planningFromShare" class="detail-note">Loading shared route...</p>
        <p v-if="shareMessage" class="detail-note detail-note--ok">{{ shareMessage }}</p>
        <p v-if="shareError" class="detail-note detail-note--error">{{ shareError }}</p>

        <div class="metric-grid">
          <article><span>Distance</span><strong>{{ recommended.distanceKm.toFixed(1) }} km</strong></article>
          <article><span>Duration</span><strong>{{ formatDuration(recommended.durationMin) }}</strong></article>
          <article><span>Difficulty</span><strong>{{ recommended.difficulty }}</strong></article>
          <article><span>Risk</span><strong>{{ recommended.riskLevel }} ({{ recommended.riskScore.toFixed(1) }})</strong></article>
        </div>

        <div class="status-tag" :class="{ 'status-tag--danger': recommended.goNoGo === 'No-Go' }">
          {{ recommended.goNoGo }}
        </div>
        <p class="detail-explain">{{ recommended.explanation }}</p>
        <p class="zone-summary">
          Coverage zones crossed:
          L1 {{ recommended.zoneSummary?.level1Count || 0 }} ·
          L2 {{ recommended.zoneSummary?.level2Count || 0 }} ·
          L3 {{ recommended.zoneSummary?.level3Count || 0 }}
        </p>

        <section v-if="geography" class="risk-block">
          <h2>Geography Profile</h2>
          <article class="tip-item">
            Ascent {{ Math.round(geography.totalAscentM || 0) }} m ·
            Descent {{ Math.round(geography.totalDescentM || 0) }} m ·
            Max slope {{ Math.round(geography.maxSlopePct || 0) }}%
          </article>
          <article class="tip-item">
            Terrain {{ geography.terrainType || 'mixed' }} ·
            Surface {{ geography.surfaceType || 'unknown' }} ·
            Trail {{ geography.trailCondition || 'unknown' }}
          </article>
          <article class="tip-item">
            Rivers {{ geography.riverCrossingCount || 0 }} ·
            Cliffs {{ geography.cliffExposureCount || 0 }} ·
            Closures {{ geography.closureCount || 0 }}
          </article>
        </section>

        <section class="risk-block">
          <h2>Key Risk Sections</h2>
          <article v-for="risk in recommended.keyRisks" :key="risk.id" class="risk-item">
            <strong>{{ risk.title }}</strong>
            <p>{{ risk.type }} · {{ risk.severity }} · {{ risk.zoneLabel }} · {{ risk.distanceKm }} km away</p>
            <p class="risk-advice">{{ risk.advice }}</p>
            <small>Source: {{ risk.source }}</small>
          </article>
        </section>

        <section class="risk-block">
          <h2>Suggested Prep</h2>
          <article v-for="tip in prepTips" :key="tip" class="tip-item">{{ tip }}</article>
        </section>
      </template>

      <template v-else>
        <h1>No planned route yet</h1>
        <p class="detail-explain">Go to Plan Route and generate a safer route first.</p>
        <p v-if="shareError" class="detail-note detail-note--error">{{ shareError }}</p>
      </template>

      <button class="share-btn" @click="shareRoute">Share Route</button>
      <button class="back-btn" @click="router.push('/route-planner')">Back to Planner</button>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background: #f0f6f3;
  position: relative;
}

.detail-map-wrap {
  position: relative;
}

.detail-map {
  width: 100%;
  height: 100%;
}

.detail-panel {
  --mobile-sheet-peek: 255px;
  border-left: 1px solid #d5e1d8;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(7px);
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-mobile-actions {
  display: none;
}

.detail-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: #3f6558;
  font-weight: 700;
}

h1 {
  font-size: 1.5rem;
  color: #1f3b33;
  font-weight: 800;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.metric-grid article {
  border: 1px solid #dbe6df;
  border-radius: 0.65rem;
  background: #fbfefc;
  padding: 0.55rem;
}

.metric-grid span {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4f6a63;
  font-weight: 700;
}

.metric-grid strong {
  display: block;
  margin-top: 0.2rem;
  color: #23433b;
}

.status-tag {
  width: fit-content;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  background: #def6ea;
  color: #136844;
  font-weight: 800;
}

.status-tag--danger {
  background: #ffe5e0;
  color: #8a2b20;
}

.detail-explain {
  color: #43605a;
  line-height: 1.45;
  font-size: 0.9rem;
}

.zone-summary {
  color: #25473f;
  font-size: 0.83rem;
  font-weight: 700;
  background: #edf7f2;
  border: 1px solid #d2e6db;
  border-radius: 0.6rem;
  padding: 0.5rem 0.6rem;
}

.risk-block h2 {
  font-size: 0.92rem;
  color: #28473f;
  font-weight: 800;
  margin-bottom: 0.45rem;
}

.risk-item,
.tip-item {
  border: 1px solid #dce6df;
  border-radius: 0.65rem;
  padding: 0.56rem;
  background: #fff;
  margin-bottom: 0.45rem;
}

.risk-item strong {
  color: #203d35;
}

.risk-item p,
.risk-item small,
.tip-item {
  color: #48635c;
  font-size: 0.84rem;
}

.risk-advice {
  margin-top: 0.3rem;
  color: #35544b;
}

.back-btn {
  margin-top: 0.5rem;
  border: 1px solid #bcd0c5;
  border-radius: 0.65rem;
  background: #fff;
  padding: 0.66rem;
  font-weight: 700;
  color: #285046;
}

.share-btn {
  margin-top: auto;
  border: 0;
  border-radius: 0.65rem;
  background: #2e7d6b;
  color: #fff;
  padding: 0.66rem;
  font-weight: 700;
}

.detail-note {
  border: 1px solid #d9e4de;
  border-radius: 0.55rem;
  padding: 0.42rem 0.55rem;
  font-size: 0.82rem;
  color: #32564a;
  background: #f6fbf8;
}

.detail-note--ok {
  border-color: #c6dfd3;
  background: #eef8f2;
}

.detail-note--error {
  border-color: #eab8af;
  color: #7d2a21;
  background: #fff2ef;
}

@media (max-width: 980px) {
  .detail-layout {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .detail-panel {
    border-left: 0;
    border-top: 1px solid #d5e1d8;
    padding: 0 1rem 1rem;
    background: rgba(255, 255, 255, 0.97);
  }

  .detail-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.4rem;
  }

  .detail-map-wrap {
    min-height: var(--mobile-safe-height);
  }
}
</style>
