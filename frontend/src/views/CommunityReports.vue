<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { fetchCommunityReports, submitCommunityReport } from '../services/communityReportApi'

const mapElement = ref(null)

const reports = ref([])
const hazards = ref([])
const fetchedAt = ref(null)
const storageMode = ref('unknown')
const loading = ref(false)
const submitLoading = ref(false)
const error = ref('')
const submitError = ref('')
const submitSuccess = ref('')

const selectedPoint = ref(null)
const isSheetExpanded = ref(false)

const form = reactive({
  title: '',
  description: '',
  locationName: '',
  hazardType: 'trail',
  severity: 'moderate',
  reporterName: '',
  imageUrl: '',
})

const hazardMeta = {
  fire: { label: 'Bushfire', color: '#D84727', icon: 'local_fire_department' },
  flood: { label: 'Flood', color: '#2165B5', icon: 'flood' },
  storm: { label: 'Storm', color: '#5A4B81', icon: 'rainy' },
  heat: { label: 'Heat', color: '#D08817', icon: 'thermostat' },
  trail: { label: 'Trail', color: '#6B5C4F', icon: 'warning' },
  other: { label: 'Other', color: '#2E7D6B', icon: 'campaign' },
}

const severityRank = { extreme: 4, high: 3, moderate: 2, low: 1 }

const sortedReports = computed(() => {
  return reports.value
    .slice()
    .sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))
})

const stats = computed(() => {
  const summary = { total: sortedReports.value.length, extreme: 0, high: 0, moderate: 0, low: 0 }
  sortedReports.value.forEach((item) => {
    if (summary[item.severity] !== undefined) summary[item.severity] += 1
  })
  return summary
})

const selectedPointLabel = computed(() => {
  if (!selectedPoint.value) return 'Click the map to select report location'
  return `${selectedPoint.value.lat}, ${selectedPoint.value.lng}`
})

let mapInstance
let hazardLayer
let reportLayer
let selectedPointLayer
let inflightReportController
let inflightHazardController
let refreshTimer

function severityLabel(value) {
  if (value === 'extreme') return 'Extreme'
  if (value === 'high') return 'High'
  if (value === 'moderate') return 'Moderate'
  return 'Low'
}

function formatRelativeTime(date) {
  const ts = date instanceof Date ? date.getTime() : Date.parse(date || '')
  if (!Number.isFinite(ts)) return 'Unknown'
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function getMarkerRadius(severity) {
  if (severity === 'extreme') return 11
  if (severity === 'high') return 9
  if (severity === 'moderate') return 7
  return 6
}

function zoneOpacitiesBySeverity(severity) {
  if (severity === 'extreme') return { l1: 0.3, l2: 0.18, l3: 0.1 }
  if (severity === 'high') return { l1: 0.24, l2: 0.14, l3: 0.08 }
  if (severity === 'moderate') return { l1: 0.18, l2: 0.1, l3: 0.06 }
  return { l1: 0.14, l2: 0.08, l3: 0.05 }
}

function drawSelectedPoint() {
  if (!selectedPointLayer) return
  selectedPointLayer.clearLayers()
  if (!selectedPoint.value) return

  L.marker([selectedPoint.value.lat, selectedPoint.value.lng], {
    icon: L.divIcon({
      className: 'planner-anchor-icon',
      html: '<div class="planner-anchor planner-anchor--report">R</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  })
    .bindPopup('Selected report point')
    .addTo(selectedPointLayer)
}

function drawHazards() {
  if (!hazardLayer) return
  hazardLayer.clearLayers()

  hazards.value.forEach((hazard) => {
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return
    const meta = hazardMeta[hazard.type] || hazardMeta.other
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
        opacity: 0.45,
        weight: zone.weight,
        interactive: false,
      }).addTo(hazardLayer)
    })

    L.circleMarker(hazard.coordinates, {
      radius: getMarkerRadius(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.86,
      weight: 2,
    })
      .bindPopup(`${hazard.title}<br/>${meta.label} · ${severityLabel(hazard.severity)}`)
      .addTo(hazardLayer)
  })
}

function drawReports() {
  if (!reportLayer) return
  reportLayer.clearLayers()

  sortedReports.value.forEach((report) => {
    if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) return
    const meta = hazardMeta[report.hazardType] || hazardMeta.other

    L.marker([report.latitude, report.longitude], {
      icon: L.divIcon({
        className: 'community-report-pin',
        html: `<div class="community-report-pin__dot" style="background:${meta.color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    })
      .bindPopup(
        `<strong>${report.title}</strong><br/>${meta.label} · ${severityLabel(report.severity)}<br/>${report.locationName}`
      )
      .addTo(reportLayer)
  })
}

async function loadHazards() {
  if (!mapInstance) return
  if (inflightHazardController) inflightHazardController.abort()
  inflightHazardController = new AbortController()

  try {
    const bounds = mapInstance.getBounds()
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    const payload = await fetchRealtimeHazards({
      bbox,
      layers: ['fire', 'flood', 'storm', 'heat', 'other'],
      signal: inflightHazardController.signal,
    })
    hazards.value = payload.hazards
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    console.error('Failed to load map hazards:', nextError)
  }
}

async function loadReports() {
  if (inflightReportController) inflightReportController.abort()
  inflightReportController = new AbortController()
  loading.value = true
  error.value = ''

  try {
    const payload = await fetchCommunityReports({
      limit: 100,
      signal: inflightReportController.signal,
    })
    reports.value = payload.reports
    storageMode.value = payload.storage
    fetchedAt.value = payload.fetchedAt
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    error.value = nextError?.message || 'Failed to fetch community reports'
  } finally {
    loading.value = false
  }
}

function validateForm() {
  if (!selectedPoint.value) return 'Please pick a location on the map first'
  if (!form.title.trim()) return 'Title is required'
  if (!form.description.trim()) return 'Description is required'
  if (!form.locationName.trim()) return 'Location name is required'
  return ''
}

async function handleSubmit() {
  submitError.value = ''
  submitSuccess.value = ''
  const validationError = validateForm()
  if (validationError) {
    submitError.value = validationError
    return
  }

  submitLoading.value = true

  try {
    await submitCommunityReport({
      title: form.title.trim(),
      description: form.description.trim(),
      locationName: form.locationName.trim(),
      hazardType: form.hazardType,
      severity: form.severity,
      latitude: selectedPoint.value.lat,
      longitude: selectedPoint.value.lng,
      reporterName: form.reporterName.trim() || 'Anonymous Hiker',
      imageUrl: form.imageUrl.trim(),
    })

    submitSuccess.value = 'Report submitted successfully.'
    isSheetExpanded.value = true
    form.title = ''
    form.description = ''
    form.locationName = ''
    form.reporterName = ''
    form.imageUrl = ''
    await loadReports()
  } catch (nextError) {
    submitError.value = nextError?.message || 'Failed to submit report'
  } finally {
    submitLoading.value = false
  }
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

onMounted(async () => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView([-37.8136, 144.9631], 7)

  mapInstance.attributionControl.setPrefix(false)
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  hazardLayer = L.layerGroup().addTo(mapInstance)
  reportLayer = L.layerGroup().addTo(mapInstance)
  selectedPointLayer = L.layerGroup().addTo(mapInstance)

  mapInstance.on('click', (event) => {
    selectedPoint.value = {
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6)),
    }
  })

  mapInstance.on('moveend', loadHazards)

  await Promise.all([loadHazards(), loadReports()])
  refreshTimer = window.setInterval(() => {
    loadHazards()
    loadReports()
  }, 60000)
})

watch(hazards, drawHazards, { deep: true })
watch(sortedReports, drawReports, { deep: true })
watch(selectedPoint, drawSelectedPoint, { deep: true })

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (inflightReportController) inflightReportController.abort()
  if (inflightHazardController) inflightHazardController.abort()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <main class="community-layout">
    <aside class="community-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': isSheetExpanded }">
      <div class="mobile-sheet__handle"></div>
      <div class="community-mobile-actions">
        <button class="mobile-sheet-toggle" @click="toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ isSheetExpanded ? 'expand_more' : 'expand_less' }}</span>
          {{ isSheetExpanded ? 'Show Less' : 'Reports & Form' }}
        </button>
      </div>
      <div class="mobile-sheet__body community-panel__body">
      <div>
        <p class="community-kicker">Community Intelligence + Official Risk Layer</p>
        <h1>Community Reports</h1>
        <p class="community-sub">Pick location on map, fill report on left, submit in same page.</p>
      </div>

      <section class="community-form">
        <div class="point-card">
          <p>Selected Map Point</p>
          <strong>{{ selectedPointLabel }}</strong>
        </div>

        <input v-model="form.title" class="field-input" type="text" placeholder="Report title" />
        <textarea v-model="form.description" class="field-input" rows="3" placeholder="Describe what you observed"></textarea>
        <input v-model="form.locationName" class="field-input" type="text" placeholder="Location name (track / park)" />

        <div class="field-row">
          <select v-model="form.hazardType" class="field-input">
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="storm">Storm / Mud</option>
            <option value="trail">Trail Obstacle</option>
            <option value="other">Other</option>
          </select>
          <select v-model="form.severity" class="field-input">
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="extreme">Extreme</option>
          </select>
        </div>

        <div class="field-row">
          <input v-model="form.reporterName" class="field-input" type="text" placeholder="Reporter name (optional)" />
          <input v-model="form.imageUrl" class="field-input" type="url" placeholder="Image URL (optional)" />
        </div>

        <button class="primary-btn" :disabled="submitLoading" @click="handleSubmit">
          {{ submitLoading ? 'Submitting...' : 'Submit Report' }}
        </button>
        <p v-if="submitError" class="error-text">{{ submitError }}</p>
        <p v-if="submitSuccess" class="ok-text">{{ submitSuccess }}</p>
        <p v-if="error" class="error-text">{{ error }}</p>
      </section>

      <section class="summary-card">
        <p class="summary-title">Live Summary</p>
        <p>{{ stats.total }} reports · E {{ stats.extreme }} · H {{ stats.high }} · M {{ stats.moderate }} · L {{ stats.low }}</p>
        <p>Storage: {{ storageMode === 'database' ? 'Railway DB' : 'Fallback' }}</p>
        <p>Last sync: {{ fetchedAt ? fetchedAt.toLocaleTimeString() : '—' }}</p>
      </section>

      <section class="feed-card">
        <p class="summary-title">Latest Reports</p>
        <p v-if="loading && !sortedReports.length" class="muted">Loading reports...</p>
        <div v-for="report in sortedReports.slice(0, 8)" :key="report.id" class="feed-item">
          <div class="feed-title-row">
            <strong>{{ report.title }}</strong>
            <span>{{ severityLabel(report.severity) }}</span>
          </div>
          <p>{{ report.locationName }} · {{ formatRelativeTime(report.reportedAt) }}</p>
        </div>
      </section>
      </div>
    </aside>

    <section class="community-map-wrap">
      <div ref="mapElement" class="community-map"></div>
      <div class="legend-overlay">
        <p>Map Layers</p>
        <span class="legend-item"><i style="background:#1F6E57"></i>User Report</span>
        <span class="legend-item"><i style="background:#D84727"></i>Fire Risk</span>
        <span class="legend-item"><i style="background:#2165B5"></i>Flood Risk</span>
        <span class="legend-item"><i style="background:#5A4B81"></i>Storm Risk</span>
        <span class="legend-item"><i style="background:#D08817"></i>Heat Risk</span>
        <span class="legend-item"><i style="background:#2E7D6B"></i>Other Risk</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
.community-layout {
  display: grid;
  grid-template-columns: 410px 1fr;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background: linear-gradient(130deg, #f3f8f5 0%, #e6f2ee 45%, #eef4fb 100%);
  position: relative;
}

.community-panel {
  --mobile-sheet-peek: 280px;
  border-right: 1px solid rgba(31, 111, 87, 0.15);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  overflow: auto;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
}

.community-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.community-mobile-actions {
  display: none;
}

.community-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #1f6e57;
}

h1 {
  margin: 0.25rem 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: #123b3e;
}

.community-sub {
  margin: 0;
  font-size: 0.88rem;
  color: #3b5358;
}

.community-form,
.summary-card,
.feed-card {
  background: #fff;
  border: 1px solid rgba(15, 40, 45, 0.08);
  border-radius: 14px;
  padding: 0.85rem;
}

.point-card {
  background: #eef4fb;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.7rem;
}

.point-card p {
  margin: 0;
  font-size: 0.72rem;
  color: #47646b;
}

.point-card strong {
  font-size: 0.8rem;
  color: #123b3e;
}

.field-input {
  width: 100%;
  border: 1px solid #d8e5e8;
  border-radius: 10px;
  padding: 0.62rem 0.7rem;
  font-size: 0.85rem;
  margin-bottom: 0.55rem;
  background: #fbfdfd;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.primary-btn {
  width: 100%;
  margin-top: 0.2rem;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #334f2b 0%, #4a6741 100%);
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-title {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  color: #1f6e57;
}

.summary-card p {
  margin: 0.18rem 0;
  font-size: 0.8rem;
  color: #284950;
}

.feed-item {
  border-top: 1px solid #edf4f5;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.feed-title-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.feed-title-row strong {
  font-size: 0.82rem;
  color: #123b3e;
}

.feed-title-row span,
.feed-item p,
.muted {
  font-size: 0.74rem;
  color: #4e6970;
  margin: 0.15rem 0 0;
}

.error-text {
  margin: 0.35rem 0 0;
  font-size: 0.76rem;
  color: #b42318;
}

.ok-text {
  margin: 0.35rem 0 0;
  font-size: 0.76rem;
  color: #0f7b6c;
}

.community-map-wrap {
  position: relative;
  min-height: 0;
}

.community-map {
  width: 100%;
  height: 100%;
}

.legend-overlay {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 500;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 45, 49, 0.08);
  border-radius: 12px;
  padding: 0.7rem;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.1);
}

.legend-overlay p {
  margin: 0 0 0.45rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #1f6e57;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  font-size: 0.75rem;
  color: #2a4b52;
  margin-top: 0.3rem;
}

.legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

:deep(.planner-anchor) {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background: #1f6e57;
}

:deep(.community-report-pin__dot) {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}

@media (max-width: 1000px) {
  .community-layout {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .community-map-wrap {
    min-height: var(--mobile-safe-height);
  }

  .community-panel {
    border-right: 0;
    border-top: 1px solid rgba(31, 111, 87, 0.15);
    padding: 0 1rem 1rem;
    background: rgba(255, 255, 255, 0.97);
  }

  .community-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.4rem;
  }

  .legend-overlay {
    top: 1rem;
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
}
</style>
