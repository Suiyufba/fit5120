<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchCommunityReports } from '../services/communityReportApi'

const router = useRouter()
const route = useRoute()

const loadingReports = ref(false)
const reportError = ref('')
const relatedReports = ref([])

const typeMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Heavy Rain / Flood', color: '#2165B5' },
  storm: { label: 'Storm / Wind', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail Hazard', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const severityMeta = {
  extreme: { label: 'Extreme', tone: 'detail-pill--danger' },
  high: { label: 'High', tone: 'detail-pill--high' },
  moderate: { label: 'Moderate', tone: 'detail-pill--moderate' },
  low: { label: 'Low', tone: 'detail-pill--low' },
}

function asText(value, fallback = '') {
  const next = Array.isArray(value) ? value[0] : value
  const text = String(next || '').trim()
  return text || fallback
}

function asNumber(value) {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIso(value) {
  const raw = asText(value)
  const ts = Date.parse(raw)
  return Number.isNaN(ts) ? '' : new Date(ts).toISOString()
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const hazard = computed(() => {
  const id = asText(route.params.id, 'hazard')
  const title = asText(route.query.title, 'Selected Risk Area')
  const type = asText(route.query.type, 'other').toLowerCase()
  const severity = asText(route.query.severity, 'moderate').toLowerCase()
  const source = asText(route.query.source, 'Official risk feed')
  const description = asText(route.query.description, 'No detail provided')
  const lat = asNumber(route.query.lat)
  const lng = asNumber(route.query.lng)
  const updatedAt = toIso(route.query.updatedAt)

  return {
    id,
    title,
    type: typeMeta[type] ? type : 'other',
    severity: severityMeta[severity] ? severity : 'moderate',
    source,
    description,
    lat,
    lng,
    updatedAt,
  }
})

const riskTypeLabel = computed(() => typeMeta[hazard.value.type]?.label || typeMeta.other.label)
const riskLevelLabel = computed(() => severityMeta[hazard.value.severity]?.label || severityMeta.moderate.label)
const riskLevelTone = computed(() => severityMeta[hazard.value.severity]?.tone || severityMeta.moderate.tone)
const riskColor = computed(() => typeMeta[hazard.value.type]?.color || typeMeta.other.color)
const locationName = computed(() => hazard.value.title)

const affectedTimeWindow = computed(() => {
  if (!hazard.value.updatedAt) return 'Current cycle (time window unavailable)'
  const startTs = Date.parse(hazard.value.updatedAt)
  if (Number.isNaN(startTs)) return 'Current cycle (time window unavailable)'
  const endTs = startTs + (24 * 60 * 60 * 1000)
  return `${new Date(startTs).toLocaleString()} - ${new Date(endTs).toLocaleString()}`
})

const recommendedAction = computed(() => {
  const type = hazard.value.type
  const severity = hazard.value.severity

  if (type === 'fire') {
    return severity === 'extreme' || severity === 'high'
      ? 'Delay this trip and avoid the area until alerts reduce. Prepare an alternate route.'
      : 'Check alerts before departure and keep a clear turnaround plan.'
  }
  if (type === 'flood' || type === 'storm') {
    return 'Avoid creek crossings, slippery sections, and low-lying tracks during this period.'
  }
  if (type === 'heat') {
    return 'Start early, increase hydration, and reduce exposed midday hiking.'
  }
  if (type === 'trail') {
    return 'Use a safer bypass where possible and allow extra time for detours.'
  }
  return 'Proceed conservatively and recheck official updates before leaving.'
})

function mapReport(raw, distanceKm) {
  return {
    id: raw.id,
    title: raw.title,
    hazardType: raw.hazardType,
    severity: raw.severity,
    locationName: raw.locationName,
    description: raw.description,
    imageUrl: raw.imageUrl,
    reportedAt: raw.reportedAt,
    reporterName: raw.reporterName,
    distanceKm: Number(distanceKm.toFixed(1)),
  }
}

async function loadRelatedReports() {
  if (!Number.isFinite(hazard.value.lat) || !Number.isFinite(hazard.value.lng)) {
    relatedReports.value = []
    return
  }

  loadingReports.value = true
  reportError.value = ''

  try {
    const payload = await fetchCommunityReports({ limit: 100 })
    const nearby = payload.reports
      .map((report) => {
        const distanceKm = haversineKm(
          hazard.value.lat,
          hazard.value.lng,
          Number(report.latitude),
          Number(report.longitude)
        )
        return { report, distanceKm }
      })
      .filter((item) => item.distanceKm <= 30)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6)
      .map((item) => mapReport(item.report, item.distanceKm))

    relatedReports.value = nearby
  } catch (error) {
    reportError.value = error?.message || 'Failed to load community reports'
  } finally {
    loadingReports.value = false
  }
}

onMounted(() => {
  loadRelatedReports()
})
</script>

<template>
  <main class="detail-page">
    <section class="detail-map-hint">
      <div class="detail-map-card">
        <p class="detail-map-kicker">Selected Risk Area</p>
        <h2>{{ locationName }}</h2>
        <p v-if="Number.isFinite(hazard.lat) && Number.isFinite(hazard.lng)">
          {{ hazard.lat.toFixed(5) }}, {{ hazard.lng.toFixed(5) }}
        </p>
        <p v-else>Location coordinates unavailable</p>
      </div>
      <div class="detail-pulse" :style="{ borderColor: riskColor }"></div>
    </section>

    <aside class="detail-panel">
      <div class="detail-panel-head">
        <p class="detail-kicker">Location Detail Panel</p>
        <button class="back-btn" @click="router.back()">Back</button>
      </div>

      <section class="detail-card">
        <h1>{{ locationName }}</h1>
        <div class="detail-meta-line">
          <span class="detail-chip" :style="{ borderColor: riskColor, color: riskColor }">{{ riskTypeLabel }}</span>
          <span class="detail-pill" :class="riskLevelTone">{{ riskLevelLabel }} risk</span>
        </div>
        <p class="detail-row"><strong>Affected time window:</strong> {{ affectedTimeWindow }}</p>
        <p class="detail-row"><strong>Recommended action:</strong> {{ recommendedAction }}</p>
        <p class="detail-row"><strong>Source:</strong> {{ hazard.source }}</p>
        <p class="detail-description">{{ hazard.description }}</p>
      </section>

      <section class="detail-card">
        <h2>Related Community Reports</h2>
        <p v-if="loadingReports" class="detail-note">Loading nearby reports...</p>
        <p v-else-if="reportError" class="detail-note detail-note--error">{{ reportError }}</p>
        <p v-else-if="!relatedReports.length" class="detail-note">No nearby community reports found for this location right now.</p>

        <article v-for="report in relatedReports" :key="report.id" class="report-item">
          <img
            v-if="report.imageUrl"
            :src="report.imageUrl"
            alt="Community report photo"
            class="report-thumb"
          />
          <div class="report-body">
            <div class="report-top">
              <strong>{{ report.title }}</strong>
              <span>{{ report.distanceKm }} km</span>
            </div>
            <p class="report-meta">
              {{ report.hazardType }} · {{ report.severity }} · {{ new Date(report.reportedAt).toLocaleString() }}
            </p>
            <p class="report-meta">{{ report.locationName }} · {{ report.reporterName }}</p>
            <p class="report-desc">{{ report.description }}</p>
          </div>
        </article>
      </section>
    </aside>
  </main>
</template>

<style scoped>
.detail-page {
  display: grid;
  grid-template-columns: 1fr 440px;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background: linear-gradient(135deg, #eef5f0 0%, #ecf3fa 55%, #f8f5ee 100%);
}

.detail-map-hint {
  position: relative;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.detail-map-card {
  border: 1px solid #cddfd4;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(5px);
  padding: 1rem;
  width: min(460px, 90%);
  z-index: 2;
}

.detail-map-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.68rem;
  font-weight: 700;
  color: #3c6558;
}

.detail-map-card h2 {
  margin-top: 0.4rem;
  color: #1e3a33;
  font-size: 1.25rem;
  font-weight: 800;
}

.detail-map-card p {
  margin-top: 0.35rem;
  color: #4e645e;
  font-size: 0.86rem;
}

.detail-pulse {
  position: absolute;
  width: 132px;
  height: 132px;
  border: 3px solid #2e7d6b;
  border-radius: 999px;
  opacity: 0.45;
  animation: pulse 1.9s ease-out infinite;
}

.detail-panel {
  border-left: 1px solid #d6e1d8;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(7px);
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.detail-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.detail-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  font-weight: 800;
  color: #3f675a;
}

.back-btn {
  border: 1px solid #c4d5cb;
  border-radius: 0.6rem;
  background: #fff;
  color: #2d5146;
  padding: 0.45rem 0.75rem;
  font-weight: 700;
}

.detail-card {
  border: 1px solid #dce6df;
  border-radius: 0.85rem;
  background: #fff;
  padding: 0.8rem;
}

.detail-card h1 {
  color: #1e3a33;
  font-size: 1.25rem;
  font-weight: 800;
}

.detail-card h2 {
  color: #2a4c42;
  font-size: 0.98rem;
  font-weight: 800;
}

.detail-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.detail-chip,
.detail-pill {
  border-radius: 999px;
  font-size: 0.73rem;
  font-weight: 700;
  padding: 0.2rem 0.52rem;
}

.detail-chip {
  border: 1px solid #92b7a5;
  color: #246a54;
}

.detail-pill--danger {
  background: #fee2dd;
  color: #93291f;
}

.detail-pill--high {
  background: #fff0df;
  color: #905300;
}

.detail-pill--moderate {
  background: #eaf3ff;
  color: #1e4f8e;
}

.detail-pill--low {
  background: #e8f7ef;
  color: #1f6b45;
}

.detail-row {
  margin-top: 0.55rem;
  color: #3f5f57;
  font-size: 0.86rem;
}

.detail-description {
  margin-top: 0.55rem;
  color: #47605a;
  font-size: 0.84rem;
  line-height: 1.45;
}

.detail-note {
  margin-top: 0.45rem;
  color: #48625b;
  font-size: 0.82rem;
}

.detail-note--error {
  color: #8d3025;
}

.report-item {
  margin-top: 0.6rem;
  border: 1px solid #dfe7e1;
  border-radius: 0.72rem;
  background: #fcfefd;
  padding: 0.55rem;
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 0.55rem;
}

.report-thumb {
  width: 72px;
  height: 72px;
  border-radius: 0.5rem;
  object-fit: cover;
}

.report-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.report-top strong {
  color: #25453c;
  font-size: 0.86rem;
}

.report-top span {
  color: #5f726c;
  font-size: 0.72rem;
  font-weight: 700;
}

.report-meta {
  margin-top: 0.2rem;
  color: #5b6d67;
  font-size: 0.74rem;
}

.report-desc {
  margin-top: 0.3rem;
  color: #49625b;
  font-size: 0.8rem;
  line-height: 1.4;
}

@keyframes pulse {
  0% {
    transform: scale(0.45);
    opacity: 0.35;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@media (max-width: 980px) {
  .detail-page {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .detail-map-hint {
    min-height: 32vh;
  }

  .detail-panel {
    border-left: 0;
    border-top: 1px solid #d6e1d8;
  }

  .report-item {
    grid-template-columns: 1fr;
  }

  .report-thumb {
    width: 100%;
    height: 140px;
  }
}
</style>
