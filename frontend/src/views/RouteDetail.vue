<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { restoreLatestRoutePlan } from '../services/routePlanStore'

const router = useRouter()
const mapElement = ref(null)
const plan = ref(null)

let mapInstance
let routeLayer

const recommended = computed(() => plan.value?.recommendedRoute || null)
const prepTips = computed(() => recommended.value?.suggestedPrep || [])

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
  drawRecommendedRoute()
})

onUnmounted(() => {
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

    <aside class="detail-panel">
      <template v-if="recommended">
        <p class="detail-kicker">Route Safety Detail</p>
        <h1>Recommended Route</h1>

        <div class="metric-grid">
          <article><span>Distance</span><strong>{{ recommended.distanceKm.toFixed(1) }} km</strong></article>
          <article><span>Duration</span><strong>{{ Math.round(recommended.durationMin) }} min</strong></article>
          <article><span>Difficulty</span><strong>{{ recommended.difficulty }}</strong></article>
          <article><span>Risk</span><strong>{{ recommended.riskLevel }} ({{ recommended.riskScore.toFixed(1) }})</strong></article>
        </div>

        <div class="status-tag" :class="{ 'status-tag--danger': recommended.goNoGo === 'No-Go' }">
          {{ recommended.goNoGo }}
        </div>
        <p class="detail-explain">{{ recommended.explanation }}</p>

        <section class="risk-block">
          <h2>Key Risk Sections</h2>
          <article v-for="risk in recommended.keyRisks" :key="risk.id" class="risk-item">
            <strong>{{ risk.title }}</strong>
            <p>{{ risk.type }} · {{ risk.severity }} · {{ risk.distanceKm }} km away</p>
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
      </template>

      <button class="back-btn" @click="router.push('/route-planner')">Back to Planner</button>
    </aside>
  </main>
</template>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  height: calc(100vh - 72px);
  background: #f0f6f3;
}

.detail-map-wrap {
  position: relative;
}

.detail-map {
  width: 100%;
  height: 100%;
}

.detail-panel {
  border-left: 1px solid #d5e1d8;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(7px);
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
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
  margin-top: auto;
  border: 1px solid #bcd0c5;
  border-radius: 0.65rem;
  background: #fff;
  padding: 0.66rem;
  font-weight: 700;
  color: #285046;
}

@media (max-width: 980px) {
  .detail-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 48vh 1fr;
  }

  .detail-panel {
    border-left: 0;
    border-top: 1px solid #d5e1d8;
  }
}
</style>
