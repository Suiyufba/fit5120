<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuthState } from '../services/authStore'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  fetchAdminOverview,
  fetchAdminRisks,
  createAdminRisk,
  updateAdminRisk,
  archiveAdminRisk,
  fetchAdminCommunityReports,
  deleteAdminCommunityReport,
  fetchAdminUsers,
  deleteAdminUser,
  fetchAdminKnowledgeArticles,
  createAdminKnowledgeArticle,
  deleteAdminKnowledgeArticle,
} from '../services/adminApi'

const { state: authState } = useAuthState()

const activeTab = ref('risk')
const loading = ref(false)
const error = ref('')
const info = ref('')

const overview = ref({ users: 0, communityReports: 0, manualRisks: 0, knowledgeArticles: 0 })
const risks = ref([])
const reports = ref([])
const users = ref([])
const articles = ref([])
const officialHazards = ref([])

const mapElement = ref(null)
const selectedRiskId = ref('')

const riskForm = reactive({
  title: '',
  description: '',
  type: 'fire',
  severity: 'high',
  latitude: '',
  longitude: '',
})

const articleForm = reactive({
  title: '',
  summary: '',
  content: '',
  topic: 'General',
  readMinutes: '5',
  sourceUrl: '',
  imageUrl: '',
  isFeatured: false,
})

const riskMeta = {
  fire: { color: '#D84727', label: 'Fire' },
  flood: { color: '#2165B5', label: 'Flood' },
  storm: { color: '#5A4B81', label: 'Storm' },
  heat: { color: '#D08817', label: 'Heat' },
  other: { color: '#2E7D6B', label: 'Other' },
}

const isEditMode = computed(() => Boolean(selectedRiskId.value))
const selectedPointLabel = computed(() => {
  if (!riskForm.latitude || !riskForm.longitude) return 'Click map to select location'
  return `${riskForm.latitude}, ${riskForm.longitude}`
})

let mapInstance
let officialLayer
let manualLayer
let draftLayer
let hazardInflightController

function tokenOrThrow() {
  const token = authState.token || ''
  if (!token) throw new Error('Please sign in first')
  return token
}

function clearRiskForm() {
  selectedRiskId.value = ''
  riskForm.title = ''
  riskForm.description = ''
  riskForm.type = 'fire'
  riskForm.severity = 'high'
  riskForm.latitude = ''
  riskForm.longitude = ''
}

function applyRiskToForm(risk) {
  selectedRiskId.value = risk.id
  riskForm.title = risk.title || ''
  riskForm.description = risk.description || ''
  riskForm.type = risk.type || 'other'
  riskForm.severity = risk.severity || 'low'
  riskForm.latitude = String(risk.coordinates?.[0] ?? '')
  riskForm.longitude = String(risk.coordinates?.[1] ?? '')
}

async function loadAdminData() {
  const token = tokenOrThrow()
  const [overviewPayload, riskPayload, reportPayload, userPayload, articlePayload] = await Promise.all([
    fetchAdminOverview(token),
    fetchAdminRisks(token),
    fetchAdminCommunityReports(token),
    fetchAdminUsers(token),
    fetchAdminKnowledgeArticles(token),
  ])
  overview.value = overviewPayload.counts || overview.value
  risks.value = riskPayload.risks || []
  reports.value = reportPayload.reports || []
  users.value = userPayload.users || []
  articles.value = articlePayload.articles || []
}

async function loadOfficialHazards() {
  if (!mapInstance) return
  if (hazardInflightController) hazardInflightController.abort()
  hazardInflightController = new AbortController()

  try {
    const bounds = mapInstance.getBounds()
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    const payload = await fetchRealtimeHazards({
      bbox,
      layers: ['fire', 'flood', 'storm', 'heat', 'other'],
      signal: hazardInflightController.signal,
    })
    officialHazards.value = payload.hazards || []
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    console.error('Failed to load official hazards on admin map', nextError)
  }
}

async function loadAll() {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    await loadAdminData()
    await loadOfficialHazards()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

function drawOfficialHazards() {
  if (!officialLayer) return
  officialLayer.clearLayers()

  officialHazards.value.forEach((hazard) => {
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return
    const meta = riskMeta[hazard.type] || riskMeta.other
    L.circleMarker(hazard.coordinates, {
      radius: 5,
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.45,
      weight: 1,
      interactive: false,
    }).addTo(officialLayer)
  })
}

function drawManualRisks() {
  if (!manualLayer) return
  manualLayer.clearLayers()

  risks.value.forEach((risk) => {
    if (!Array.isArray(risk.coordinates) || risk.coordinates.length !== 2) return
    const meta = riskMeta[risk.type] || riskMeta.other
    const isSelected = risk.id === selectedRiskId.value

    const marker = L.circleMarker(risk.coordinates, {
      radius: isSelected ? 10 : 8,
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.9,
      weight: isSelected ? 3 : 2,
    })

    marker.bindPopup(`${risk.title}<br/>${meta.label} · ${risk.severity}`)
    marker.on('click', () => {
      applyRiskToForm(risk)
    })
    marker.addTo(manualLayer)
  })
}

function drawDraftPoint() {
  if (!draftLayer) return
  draftLayer.clearLayers()

  const lat = Number(riskForm.latitude)
  const lng = Number(riskForm.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

  L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'planner-anchor-icon',
      html: '<div class="admin-draft-pin">D</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),
  }).addTo(draftLayer)
}

async function handleCreateOrUpdateRisk() {
  error.value = ''
  info.value = ''
  try {
    const token = tokenOrThrow()
    const payload = {
      title: riskForm.title,
      description: riskForm.description,
      type: riskForm.type,
      severity: riskForm.severity,
      latitude: Number(riskForm.latitude),
      longitude: Number(riskForm.longitude),
    }

    if (isEditMode.value) {
      await updateAdminRisk(token, selectedRiskId.value, payload)
      info.value = 'Risk updated'
    } else {
      await createAdminRisk(token, payload)
      info.value = 'Risk created'
    }

    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to save risk'
  }
}

async function handleArchiveRisk(riskId = selectedRiskId.value) {
  if (!riskId) return
  error.value = ''
  info.value = ''
  try {
    const token = tokenOrThrow()
    await archiveAdminRisk(token, riskId)
    info.value = 'Risk removed'
    clearRiskForm()
    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to remove risk'
  }
}

async function handleDeleteReport(reportId) {
  try {
    const token = tokenOrThrow()
    await deleteAdminCommunityReport(token, reportId)
    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to delete report'
  }
}

async function handleDeleteUser(userId) {
  try {
    const token = tokenOrThrow()
    await deleteAdminUser(token, userId)
    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to delete user'
  }
}

async function handleCreateArticle() {
  try {
    const token = tokenOrThrow()
    await createAdminKnowledgeArticle(token, {
      title: articleForm.title,
      summary: articleForm.summary,
      content: articleForm.content,
      topic: articleForm.topic,
      readMinutes: Number(articleForm.readMinutes),
      sourceUrl: articleForm.sourceUrl,
      imageUrl: articleForm.imageUrl,
      isFeatured: articleForm.isFeatured,
    })
    articleForm.title = ''
    articleForm.summary = ''
    articleForm.content = ''
    articleForm.topic = 'General'
    articleForm.readMinutes = '5'
    articleForm.sourceUrl = ''
    articleForm.imageUrl = ''
    articleForm.isFeatured = false
    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to create article'
  }
}

async function handleDeleteArticle(articleId) {
  try {
    const token = tokenOrThrow()
    await deleteAdminKnowledgeArticle(token, articleId)
    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to delete article'
  }
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

  officialLayer = L.layerGroup().addTo(mapInstance)
  manualLayer = L.layerGroup().addTo(mapInstance)
  draftLayer = L.layerGroup().addTo(mapInstance)

  mapInstance.on('click', (event) => {
    selectedRiskId.value = ''
    riskForm.latitude = Number(event.latlng.lat.toFixed(6)).toString()
    riskForm.longitude = Number(event.latlng.lng.toFixed(6)).toString()
  })

  mapInstance.on('moveend', loadOfficialHazards)
  await loadAll()
})

watch(officialHazards, drawOfficialHazards, { deep: true })
watch(risks, drawManualRisks, { deep: true })
watch(
  () => [riskForm.latitude, riskForm.longitude, selectedRiskId.value],
  drawDraftPoint
)

onUnmounted(() => {
  if (hazardInflightController) hazardInflightController.abort()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <main class="admin-page">
    <section class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="kicker">Operations Center</p>
          <h1>Admin Dashboard</h1>
          <p class="sub">Manage risks, community reports, users, and knowledge articles in one place.</p>
        </div>
        <button class="refresh-btn" :disabled="loading" @click="loadAll">{{ loading ? 'Refreshing...' : 'Refresh' }}</button>
      </header>

      <div class="metrics">
        <article><span>Users</span><strong>{{ overview.users }}</strong></article>
        <article><span>Community Reports</span><strong>{{ overview.communityReports }}</strong></article>
        <article><span>Manual Risks</span><strong>{{ overview.manualRisks }}</strong></article>
        <article><span>Knowledge Articles</span><strong>{{ overview.knowledgeArticles }}</strong></article>
      </div>

      <p v-if="error" class="error-box">{{ error }}</p>
      <p v-if="info" class="ok-box">{{ info }}</p>

      <nav class="tabs">
        <button :class="{ active: activeTab === 'risk' }" @click="activeTab = 'risk'">Risk Map</button>
        <button :class="{ active: activeTab === 'reports' }" @click="activeTab = 'reports'">Community Reports</button>
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">Users</button>
        <button :class="{ active: activeTab === 'knowledge' }" @click="activeTab = 'knowledge'">KnowledgeHub</button>
      </nav>

      <section v-if="activeTab === 'risk'" class="risk-layout">
        <div class="risk-form">
          <h2>{{ isEditMode ? 'Edit Selected Risk' : 'Create Manual Risk' }}</h2>
          <p class="map-hint">Location: {{ selectedPointLabel }}</p>
          <div class="form-grid">
            <input v-model="riskForm.title" placeholder="Risk title" />
            <input v-model="riskForm.description" placeholder="Risk description" />
            <select v-model="riskForm.type">
              <option value="fire">Fire</option>
              <option value="flood">Flood</option>
              <option value="storm">Storm</option>
              <option value="heat">Heat</option>
              <option value="other">Other</option>
            </select>
            <select v-model="riskForm.severity">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
            <input v-model="riskForm.latitude" type="number" step="0.000001" placeholder="Latitude" />
            <input v-model="riskForm.longitude" type="number" step="0.000001" placeholder="Longitude" />
          </div>

          <div class="row-actions">
            <button class="primary-btn" @click="handleCreateOrUpdateRisk">
              {{ isEditMode ? 'Save Changes' : 'Create Risk' }}
            </button>
            <button class="ghost-btn" @click="clearRiskForm">Clear</button>
            <button v-if="isEditMode" class="danger-btn" @click="handleArchiveRisk()">Remove</button>
          </div>

          <div class="list">
            <article v-for="risk in risks" :key="risk.id" class="clickable" @click="applyRiskToForm(risk)">
              <div>
                <strong>{{ risk.title }}</strong>
                <p>{{ risk.type }} · {{ risk.severity }} · {{ risk.coordinates?.[0] }}, {{ risk.coordinates?.[1] }}</p>
              </div>
              <button class="danger-btn" @click.stop="handleArchiveRisk(risk.id)">Remove</button>
            </article>
          </div>
        </div>

        <div class="risk-map-wrap">
          <div ref="mapElement" class="risk-map"></div>
          <div class="map-legend">
            <p>Map Layers</p>
            <span><i style="background:#1f6e57"></i>Editable Manual Risk</span>
            <span><i style="background:#9aa5af"></i>Official Risk (Read-only)</span>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'reports'" class="panel">
        <h2>Manage Community Reports</h2>
        <div class="list">
          <article v-for="report in reports" :key="report.id">
            <div>
              <strong>{{ report.title }}</strong>
              <p>{{ report.hazardType }} · {{ report.severity }} · {{ report.locationName }}</p>
            </div>
            <button class="danger-btn" @click="handleDeleteReport(report.id)">Delete</button>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'users'" class="panel">
        <h2>Manage Users</h2>
        <div class="list">
          <article v-for="user in users" :key="user.id">
            <div>
              <strong>{{ user.email }}</strong>
              <p>{{ user.region || 'N/A' }} · {{ user.experienceLevel }} · score {{ user.assessmentScore }}</p>
            </div>
            <button class="danger-btn" @click="handleDeleteUser(user.id)">Delete</button>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'knowledge'" class="panel">
        <h2>Manage Knowledge Articles</h2>
        <div class="form-grid">
          <input v-model="articleForm.title" placeholder="Title" />
          <input v-model="articleForm.topic" placeholder="Topic" />
          <input v-model="articleForm.summary" placeholder="Summary" />
          <input v-model="articleForm.readMinutes" type="number" min="1" max="60" placeholder="Read minutes" />
          <input v-model="articleForm.sourceUrl" placeholder="Source URL" />
          <input v-model="articleForm.imageUrl" placeholder="Image URL" />
          <textarea v-model="articleForm.content" rows="4" placeholder="Article content"></textarea>
          <label class="check-row"><input v-model="articleForm.isFeatured" type="checkbox" /> Featured</label>
        </div>
        <button class="primary-btn" @click="handleCreateArticle">Create Article</button>

        <div class="list">
          <article v-for="article in articles" :key="article.id">
            <div>
              <strong>{{ article.title }}</strong>
              <p>{{ article.topic }} · {{ article.readMinutes }} min</p>
            </div>
            <button class="danger-btn" @click="handleDeleteArticle(article.id)">Delete</button>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 72px);
  padding: 1.2rem;
  background: linear-gradient(145deg, #edf5f0 0%, #e7f0f6 100%);
}

.admin-shell {
  max-width: 1280px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #d8e4da;
  border-radius: 16px;
  padding: 1rem;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: flex-start;
}

.kicker {
  margin: 0;
  color: #42685c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 700;
}

h1 {
  margin: 0.2rem 0;
  color: #143d36;
}

.sub {
  margin: 0;
  color: #446560;
  font-size: 0.9rem;
}

.refresh-btn {
  border: 1px solid #b8d0bf;
  border-radius: 10px;
  background: #fff;
  padding: 0.48rem 0.82rem;
}

.metrics {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
}

.metrics article {
  border: 1px solid #deebe1;
  background: #fbfefc;
  border-radius: 12px;
  padding: 0.7rem;
}

.metrics span {
  font-size: 0.74rem;
  text-transform: uppercase;
  color: #4d665e;
}

.metrics strong {
  display: block;
  font-size: 1.2rem;
  color: #1b3f37;
}

.error-box {
  margin: 0.7rem 0 0;
  color: #b42318;
  font-size: 0.85rem;
}

.ok-box {
  margin: 0.4rem 0 0;
  color: #0f7b6c;
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.7rem;
}

.tabs button {
  border: 1px solid #d6e5dc;
  background: #fff;
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
}

.tabs button.active {
  background: #23493f;
  color: #fff;
}

.risk-layout {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 0.8rem;
  min-height: 520px;
}

.risk-form {
  border: 1px solid #deebe1;
  border-radius: 14px;
  padding: 0.85rem;
  background: #fff;
  overflow: auto;
}

.risk-map-wrap {
  border: 1px solid #deebe1;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
}

.risk-map {
  width: 100%;
  height: 100%;
  min-height: 520px;
}

.map-legend {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 500;
  background: rgba(255, 255, 255, 0.93);
  border: 1px solid #dbe6e2;
  border-radius: 12px;
  padding: 0.6rem;
}

.map-legend p {
  margin: 0 0 0.25rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2d5a4f;
  font-weight: 700;
}

.map-legend span {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.74rem;
  color: #38565a;
  margin-top: 0.22rem;
}

.map-legend i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.panel {
  margin-top: 0.8rem;
  border: 1px solid #deebe1;
  border-radius: 14px;
  padding: 0.85rem;
}

h2 {
  margin: 0 0 0.6rem;
  color: #163f37;
  font-size: 1.02rem;
}

.map-hint {
  margin: 0 0 0.6rem;
  font-size: 0.78rem;
  color: #47646b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.form-grid input,
.form-grid select,
.form-grid textarea {
  border: 1px solid #d8e5e0;
  border-radius: 10px;
  padding: 0.52rem 0.62rem;
  font-size: 0.86rem;
}

.form-grid textarea {
  grid-column: span 2;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.row-actions {
  margin-top: 0.6rem;
  display: flex;
  gap: 0.45rem;
}

.primary-btn {
  border: none;
  border-radius: 10px;
  padding: 0.58rem 0.8rem;
  color: #fff;
  background: linear-gradient(135deg, #334f2b 0%, #4a6741 100%);
  font-weight: 700;
}

.ghost-btn {
  border: 1px solid #d3e0da;
  border-radius: 10px;
  padding: 0.58rem 0.8rem;
  background: #fff;
}

.list {
  margin-top: 0.7rem;
  display: grid;
  gap: 0.5rem;
}

.list article {
  border: 1px solid #e5ece8;
  border-radius: 10px;
  background: #fff;
  padding: 0.6rem;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}

.list article.clickable {
  cursor: pointer;
}

.list strong {
  color: #173f37;
}

.list p {
  margin: 0.15rem 0 0;
  color: #4d665e;
  font-size: 0.8rem;
}

.danger-btn {
  border: 1px solid #ebc7c7;
  background: #fff6f6;
  color: #a11c1c;
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
}

:deep(.admin-draft-pin) {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background: #1f6e57;
}

@media (max-width: 1080px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .risk-layout {
    grid-template-columns: 1fr;
  }

  .risk-map {
    min-height: 420px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid textarea {
    grid-column: span 1;
  }
}
</style>
