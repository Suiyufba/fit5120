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
  createAdminCommunityReport,
  updateAdminCommunityReport,
  deleteAdminCommunityReport,
  fetchAdminUsers,
  deleteAdminUser,
  fetchAdminKnowledgeArticles,
  createAdminKnowledgeArticle,
  deleteAdminKnowledgeArticle,
} from '../services/adminApi'

const { state: authState } = useAuthState()

const activeTab = ref('map')
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
const selectedEntity = ref({ kind: '', id: '' })

const entityForm = reactive({
  sourceKind: 'risk',
  title: '',
  description: '',
  type: 'fire',
  severity: 'high',
  latitude: '',
  longitude: '',
  locationName: '',
  reporterName: '',
  imageUrl: '',
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
  trail: { color: '#6B5C4F', label: 'Trail' },
  other: { color: '#2E7D6B', label: 'Other' },
}

const isEditMode = computed(() => Boolean(selectedEntity.value.id))
const selectedPointLabel = computed(() => {
  if (!entityForm.latitude || !entityForm.longitude) return 'Click map to select location'
  return `${entityForm.latitude}, ${entityForm.longitude}`
})

const mapEntities = computed(() => {
  const manual = risks.value.map((risk) => ({ kind: 'risk', ...risk }))
  const community = reports.value.map((report) => ({
    kind: 'report',
    id: report.id,
    title: report.title,
    description: report.description,
    type: report.hazardType,
    severity: report.severity,
    coordinates: [report.latitude, report.longitude],
    locationName: report.locationName,
    reporterName: report.reporterName,
    imageUrl: report.imageUrl,
  }))
  return [...manual, ...community]
})

let mapInstance
let officialLayer
let riskLayer
let reportLayer
let draftLayer
let hazardInflightController
let suppressNextMapClick = false

function tokenOrThrow() {
  const token = authState.token || ''
  if (!token) throw new Error('Please sign in first')
  return token
}

function clearEntityForm() {
  selectedEntity.value = { kind: '', id: '' }
  entityForm.sourceKind = 'risk'
  entityForm.title = ''
  entityForm.description = ''
  entityForm.type = 'fire'
  entityForm.severity = 'high'
  entityForm.latitude = ''
  entityForm.longitude = ''
  entityForm.locationName = ''
  entityForm.reporterName = ''
  entityForm.imageUrl = ''
}

function applyEntityToForm(entity) {
  selectedEntity.value = { kind: entity.kind, id: entity.id }
  entityForm.sourceKind = entity.kind === 'risk' ? 'risk' : 'report'
  entityForm.title = entity.title || ''
  entityForm.description = entity.description || ''
  entityForm.type = entity.type || 'other'
  entityForm.severity = entity.severity || 'low'
  entityForm.latitude = String(entity.coordinates?.[0] ?? '')
  entityForm.longitude = String(entity.coordinates?.[1] ?? '')
  entityForm.locationName = entity.locationName || ''
  entityForm.reporterName = entity.reporterName || ''
  entityForm.imageUrl = entity.imageUrl || ''
}

function applyDraggedPosition(entity, latlng) {
  applyEntityToForm(entity)
  entityForm.latitude = Number(latlng.lat.toFixed(6)).toString()
  entityForm.longitude = Number(latlng.lng.toFixed(6)).toString()
  info.value = 'Position updated by drag. Click Save Changes to persist.'
}

function handleEntityMarkerInteraction(entity, event) {
  suppressNextMapClick = true
  if (event?.originalEvent) {
    L.DomEvent.stopPropagation(event.originalEvent)
  }
  applyEntityToForm(entity)
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
    L.circleMarker(hazard.coordinates, {
      radius: 5,
      color: '#8fa2ad',
      fillColor: '#8fa2ad',
      fillOpacity: 0.35,
      weight: 1,
      interactive: false,
    }).addTo(officialLayer)
  })
}

function drawManagedEntities() {
  if (!riskLayer || !reportLayer) return
  riskLayer.clearLayers()
  reportLayer.clearLayers()

  mapEntities.value.forEach((entity) => {
    if (!Array.isArray(entity.coordinates) || entity.coordinates.length !== 2) return
    const meta = riskMeta[entity.type] || riskMeta.other
    const isSelected = entity.id === selectedEntity.value.id && entity.kind === selectedEntity.value.kind

    if (entity.kind === 'risk') {
      const marker = L.marker(entity.coordinates, {
        draggable: true,
        icon: L.divIcon({
          className: 'admin-risk-pin',
          html: `<div class="admin-risk-pin__dot ${isSelected ? 'admin-risk-pin__dot--selected' : ''}" style="background:${meta.color}"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
      marker.bindPopup(`[Risk] ${entity.title}<br/>${meta.label} · ${entity.severity}`)
      marker.on('click', (event) => handleEntityMarkerInteraction(entity, event))
      marker.on('dragstart', (event) => handleEntityMarkerInteraction(entity, event))
      marker.on('dragend', (event) => applyDraggedPosition(entity, event.target.getLatLng()))
      marker.addTo(riskLayer)
      return
    }

    const marker = L.marker(entity.coordinates, {
      draggable: true,
      icon: L.divIcon({
        className: 'admin-report-pin',
        html: `<div class="admin-report-pin__dot ${isSelected ? 'admin-report-pin__dot--selected' : ''}" style="border-color:${meta.color}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    })
    marker.bindPopup(`[Report] ${entity.title}<br/>${meta.label} · ${entity.severity}`)
    marker.on('click', (event) => handleEntityMarkerInteraction(entity, event))
    marker.on('dragstart', (event) => handleEntityMarkerInteraction(entity, event))
    marker.on('dragend', (event) => applyDraggedPosition(entity, event.target.getLatLng()))
    marker.addTo(reportLayer)
  })
}

function drawDraftPoint() {
  if (!draftLayer) return
  draftLayer.clearLayers()

  const lat = Number(entityForm.latitude)
  const lng = Number(entityForm.longitude)
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

async function handleCreateOrUpdateEntity() {
  error.value = ''
  info.value = ''
  try {
    const token = tokenOrThrow()
    const basePayload = {
      title: entityForm.title,
      description: entityForm.description,
      hazardType: entityForm.type,
      type: entityForm.type,
      severity: entityForm.severity,
      latitude: Number(entityForm.latitude),
      longitude: Number(entityForm.longitude),
      locationName: entityForm.locationName || 'Unknown location',
      reporterName: entityForm.reporterName || 'Admin',
      imageUrl: entityForm.imageUrl,
    }

    if (isEditMode.value) {
      if (selectedEntity.value.kind === 'risk') {
        await updateAdminRisk(token, selectedEntity.value.id, basePayload)
      } else {
        await updateAdminCommunityReport(token, selectedEntity.value.id, basePayload)
      }
      info.value = 'Item updated'
    } else {
      if (entityForm.sourceKind === 'risk') {
        await createAdminRisk(token, basePayload)
      } else {
        await createAdminCommunityReport(token, basePayload)
      }
      info.value = 'Item created'
    }

    await loadAdminData()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to save item'
  }
}

async function handleRemoveSelected() {
  if (!selectedEntity.value.id) return
  error.value = ''
  info.value = ''
  try {
    const token = tokenOrThrow()
    if (selectedEntity.value.kind === 'risk') {
      await archiveAdminRisk(token, selectedEntity.value.id)
    } else {
      await deleteAdminCommunityReport(token, selectedEntity.value.id)
    }
    clearEntityForm()
    await loadAdminData()
    info.value = 'Item removed'
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to remove item'
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
  riskLayer = L.layerGroup().addTo(mapInstance)
  reportLayer = L.layerGroup().addTo(mapInstance)
  draftLayer = L.layerGroup().addTo(mapInstance)

  mapInstance.on('click', (event) => {
    if (suppressNextMapClick) {
      suppressNextMapClick = false
      return
    }
    selectedEntity.value = { kind: '', id: '' }
    entityForm.latitude = Number(event.latlng.lat.toFixed(6)).toString()
    entityForm.longitude = Number(event.latlng.lng.toFixed(6)).toString()
  })

  mapInstance.on('moveend', loadOfficialHazards)
  await loadAll()
})

watch(officialHazards, drawOfficialHazards, { deep: true })
watch([risks, reports, selectedEntity], drawManagedEntities, { deep: true })
watch(() => [entityForm.latitude, entityForm.longitude], drawDraftPoint)

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
          <p class="sub">Unified map management for manual risks and community reports.</p>
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
        <button :class="{ active: activeTab === 'map' }" @click="activeTab = 'map'">Map Ops</button>
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">Users</button>
        <button :class="{ active: activeTab === 'knowledge' }" @click="activeTab = 'knowledge'">KnowledgeHub</button>
      </nav>

      <section v-if="activeTab === 'map'" class="risk-layout">
        <div class="risk-form">
          <h2>{{ isEditMode ? 'Edit Selected Item' : 'Create New Item' }}</h2>
          <p class="map-hint">Location: {{ selectedPointLabel }}</p>

          <div class="form-grid">
            <select v-model="entityForm.sourceKind" :disabled="isEditMode">
              <option value="risk">Manual Risk</option>
              <option value="report">Community Report</option>
            </select>
            <input v-model="entityForm.title" placeholder="Title" />

            <input v-model="entityForm.description" placeholder="Description" />
            <input v-model="entityForm.locationName" placeholder="Location Name (for report)" />

            <select v-model="entityForm.type">
              <option value="fire">Fire</option>
              <option value="flood">Flood</option>
              <option value="storm">Storm</option>
              <option value="heat">Heat</option>
              <option value="trail">Trail</option>
              <option value="other">Other</option>
            </select>
            <select v-model="entityForm.severity">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>

            <input v-model="entityForm.latitude" type="number" step="0.000001" placeholder="Latitude" />
            <input v-model="entityForm.longitude" type="number" step="0.000001" placeholder="Longitude" />

            <input v-model="entityForm.reporterName" placeholder="Reporter (for report)" />
            <input v-model="entityForm.imageUrl" placeholder="Image URL (for report)" />
          </div>

          <div class="row-actions">
            <button class="primary-btn" @click="handleCreateOrUpdateEntity">
              {{ isEditMode ? 'Save Changes' : 'Create' }}
            </button>
            <button class="ghost-btn" @click="clearEntityForm">Clear</button>
            <button v-if="isEditMode" class="danger-btn" @click="handleRemoveSelected">Remove</button>
          </div>

          <div class="list">
            <article v-for="item in mapEntities" :key="item.kind + '-' + item.id" class="clickable" @click="applyEntityToForm(item)">
              <div>
                <strong>[{{ item.kind === 'risk' ? 'Risk' : 'Report' }}] {{ item.title }}</strong>
                <p>{{ item.type }} · {{ item.severity }} · {{ item.coordinates?.[0] }}, {{ item.coordinates?.[1] }}</p>
              </div>
            </article>
          </div>
        </div>

        <div class="risk-map-wrap">
          <div ref="mapElement" class="risk-map"></div>
          <div class="map-legend">
            <p>Map Layers</p>
            <span><i style="background:#1f6e57"></i>Manual Risk (editable)</span>
            <span><i style="border-color:#1f6e57; background:#fff"></i>Community Report (editable)</span>
            <span><i style="background:#8fa2ad"></i>Official Risk (read-only)</span>
          </div>
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
  grid-template-columns: 390px 1fr;
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
  border: 2px solid transparent;
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

:deep(.admin-report-pin__dot) {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid #1f6e57;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}

:deep(.admin-report-pin__dot--selected) {
  transform: scale(1.2);
  box-shadow: 0 0 0 3px rgba(31, 110, 87, 0.2);
}

:deep(.admin-risk-pin__dot) {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}

:deep(.admin-risk-pin__dot--selected) {
  transform: scale(1.2);
  box-shadow: 0 0 0 3px rgba(31, 110, 87, 0.2);
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
