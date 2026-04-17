<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { fetchCommunityReports, submitCommunityReport } from '../services/communityReportApi'
import {
  applyVictoriaMapConstraints,
  getMapBboxWithinVictoria,
  isLatLngInVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'

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
const activeMobileTab = ref('submit')
const isMobileViewport = ref(false)

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
const otherCategoryPalette = ['#2E7D6B', '#9A3412', '#0369A1', '#7C3AED', '#B45309', '#BE185D', '#0F766E', '#475569']

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

function syncViewportMode() {
  if (typeof window === 'undefined') return
  isMobileViewport.value = window.innerWidth <= 1000
  if (!isMobileViewport.value) {
    isSheetExpanded.value = false
    return
  }
}

function severityLabel(value) {
  if (value === 'extreme') return 'Extreme'
  if (value === 'high') return 'High'
  if (value === 'moderate') return 'Moderate'
  return 'Low'
}

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

function formatRelativeTime(date) {
  const ts = date instanceof Date ? date.getTime() : Date.parse(date || '')
  if (!Number.isFinite(ts)) return 'Unknown'
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function formatUpdatedTime(value) {
  const ts = Date.parse(value || '')
  if (Number.isNaN(ts)) return 'Time unknown'
  return new Date(ts).toLocaleString()
}

function normalizeCategoryKey(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'unspecified'
  return raw.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatCategoryLabel(value) {
  const normalized = normalizeCategoryKey(value)
  if (normalized === 'unspecified') return 'Unspecified'
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function hashCode(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function colorForOtherCategory(categoryKey) {
  const bucket = hashCode(normalizeCategoryKey(categoryKey)) % otherCategoryPalette.length
  return otherCategoryPalette[bucket]
}

function resolveHazardCategory(hazard) {
  return formatCategoryLabel(hazard?.riskCategory || hazard?.category || '')
}

function resolveHazardVisual(hazard) {
  if (hazard?.type !== 'other') return hazardMeta[hazard?.type] || hazardMeta.other
  const category = resolveHazardCategory(hazard)
  return {
    label: category,
    color: colorForOtherCategory(category),
  }
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
    const meta = resolveHazardVisual(hazard)
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

    const hazardMarker = L.circleMarker(hazard.coordinates, {
      radius: getMarkerRadius(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.86,
      weight: 2,
      bubblingMouseEvents: false,
    })

    hazardMarker
      .bindPopup(
        `
        <div style="min-width: 200px;">
          <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(hazard.title)}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
          <div style="font-size: 11px; color: #5f6b66;">
            ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel(hazard.severity) || 'Unknown')}<br />
            Category: ${escapeHtml(resolveHazardCategory(hazard))}<br />
            Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
            Source: ${escapeHtml(hazard.source)}
          </div>
        </div>
      `
      )
      .addTo(hazardLayer)

    hazardMarker.on('click', (event) => {
      L.DomEvent.stopPropagation(event)
    })
  })
}

function drawReports() {
  if (!reportLayer) return
  reportLayer.clearLayers()

  sortedReports.value.forEach((report) => {
    if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) return
    const meta = hazardMeta[report.hazardType] || hazardMeta.other

    const reportMarker = L.marker([report.latitude, report.longitude], {
      icon: L.divIcon({
        className: 'community-report-pin',
        html: `<div class="community-report-pin__dot" style="background:${meta.color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
      bubblingMouseEvents: false,
    })

    reportMarker
      .bindPopup(
        `<strong>${report.title}</strong><br/>${meta.label} · ${severityLabel(report.severity)}<br/>${report.locationName}<br/>${report.description}`
      )
      .addTo(reportLayer)

    reportMarker.on('click', (event) => {
      L.DomEvent.stopPropagation(event)
    })
  })
}

async function loadHazards() {
  if (!mapInstance) return
  if (inflightHazardController) inflightHazardController.abort()
  inflightHazardController = new AbortController()

  try {
    const payload = await fetchRealtimeHazards({
      bbox: getMapBboxWithinVictoria(mapInstance),
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: inflightHazardController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        hazards.value = freshPayload.hazards
      },
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
      preferCache: true,
      onUpdate: (freshPayload) => {
        reports.value = freshPayload.reports
        storageMode.value = freshPayload.storage
        fetchedAt.value = freshPayload.fetchedAt || freshPayload.cachedAt || new Date()
      },
    })
    reports.value = payload.reports
    storageMode.value = payload.storage
    fetchedAt.value = payload.fetchedAt || payload.cachedAt || new Date()
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
    activeMobileTab.value = 'feed'
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
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)

  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom)
  applyVictoriaMapConstraints(mapInstance)

  mapInstance.attributionControl.setPrefix(false)
  L.control.zoom({ position: isMobileViewport.value ? 'topright' : 'bottomright' }).addTo(mapInstance)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  hazardLayer = L.layerGroup().addTo(mapInstance)
  reportLayer = L.layerGroup().addTo(mapInstance)
  selectedPointLayer = L.layerGroup().addTo(mapInstance)

  mapInstance.on('click', (event) => {
    if (!isLatLngInVictoria(event.latlng)) {
      submitError.value = 'Report locations must be selected within Victoria.'
      return
    }

    selectedPoint.value = {
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6)),
    }
    submitError.value = ''
    if (isMobileViewport.value) {
      isSheetExpanded.value = true
      activeMobileTab.value = 'submit'
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
  window.removeEventListener('resize', syncViewportMode)
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
          {{ isSheetExpanded ? 'Show Less' : 'Open Community Panel' }}
        </button>
      </div>
      <div class="mobile-sheet__body community-panel__body">
      <div>
        <p class="community-kicker">Community Intelligence + Official Risk Layer</p>
        <h1>Community Reports</h1>
        <p class="community-sub">Pick location on map, fill report on left, submit in same page.</p>
      </div>

      <section class="community-mobile-summary" v-if="isMobileViewport">
        <article>
          <span>Reports</span>
          <strong>{{ stats.total }}</strong>
        </article>
        <article>
          <span>Point</span>
          <strong>{{ selectedPoint ? 'Selected' : 'Tap map' }}</strong>
        </article>
        <article>
          <span>Sync</span>
          <strong>{{ fetchedAt ? fetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' }}</strong>
        </article>
      </section>

      <div class="community-mobile-tabs" v-if="isMobileViewport">
        <button
          class="community-mobile-tab"
          :class="{ 'community-mobile-tab--active': activeMobileTab === 'submit' }"
          @click="activeMobileTab = 'submit'"
        >
          Submit
        </button>
        <button
          class="community-mobile-tab"
          :class="{ 'community-mobile-tab--active': activeMobileTab === 'feed' }"
          @click="activeMobileTab = 'feed'"
        >
          Feed
        </button>
      </div>

      <section class="community-form" v-show="!isMobileViewport || activeMobileTab === 'submit'">
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

      <section class="feed-card" v-show="!isMobileViewport || activeMobileTab === 'feed'">
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
        <div class="legend-grid">
          <span class="legend-item"><i style="background:#1F6E57"></i>User</span>
          <span class="legend-item"><i style="background:#D84727"></i>Fire</span>
          <span class="legend-item"><i style="background:#2165B5"></i>Flood</span>
          <span class="legend-item"><i style="background:#5A4B81"></i>Storm</span>
          <span class="legend-item"><i style="background:#D08817"></i>Heat</span>
          <span class="legend-item"><i style="background:#2E7D6B"></i>Other</span>
        </div>
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
  --mobile-sheet-peek: 168px;
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

.community-mobile-summary,
.community-mobile-tabs {
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

.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem 0.8rem;
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

  .community-mobile-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .community-mobile-summary article {
    border: 1px solid #dde7e7;
    border-radius: 0.8rem;
    padding: 0.55rem 0.6rem;
    background: #fbfefd;
  }

  .community-mobile-summary span {
    display: block;
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #55716b;
    font-weight: 800;
  }

  .community-mobile-summary strong {
    display: block;
    margin-top: 0.18rem;
    font-size: 0.88rem;
    color: #173a34;
  }

  .community-mobile-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }

  .community-mobile-tab {
    border: 1px solid #d9e5e5;
    border-radius: 999px;
    background: #f8fbfb;
    padding: 0.62rem 0.78rem;
    font-size: 0.8rem;
    font-weight: 800;
    color: #35524d;
  }

  .community-mobile-tab--active {
    background: #21493f;
    border-color: #21493f;
    color: #fff;
  }

  .legend-overlay {
    top: 0.8rem;
    left: 0.8rem;
    right: auto;
    max-width: min(210px, calc(100vw - 1.6rem));
    padding: 0.55rem 0.65rem;
  }

  .legend-overlay p {
    margin-bottom: 0.3rem;
    font-size: 0.68rem;
  }

  .legend-item {
    margin-top: 0.12rem;
    font-size: 0.69rem;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
