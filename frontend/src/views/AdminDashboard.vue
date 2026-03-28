<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useAuthState } from '../services/authStore'
import {
  fetchAdminOverview,
  fetchAdminRisks,
  createAdminRisk,
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

const overview = ref({ users: 0, communityReports: 0, manualRisks: 0, knowledgeArticles: 0 })
const risks = ref([])
const reports = ref([])
const users = ref([])
const articles = ref([])

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

function tokenOrThrow() {
  const token = authState.token || ''
  if (!token) throw new Error('Please sign in first')
  return token
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
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
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

async function handleCreateRisk() {
  try {
    const token = tokenOrThrow()
    await createAdminRisk(token, {
      title: riskForm.title,
      description: riskForm.description,
      type: riskForm.type,
      severity: riskForm.severity,
      latitude: Number(riskForm.latitude),
      longitude: Number(riskForm.longitude),
    })
    riskForm.title = ''
    riskForm.description = ''
    riskForm.latitude = ''
    riskForm.longitude = ''
    await loadAll()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to create risk'
  }
}

async function handleArchiveRisk(riskId) {
  try {
    const token = tokenOrThrow()
    await archiveAdminRisk(token, riskId)
    await loadAll()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to archive risk'
  }
}

async function handleDeleteReport(reportId) {
  try {
    const token = tokenOrThrow()
    await deleteAdminCommunityReport(token, reportId)
    await loadAll()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to delete report'
  }
}

async function handleDeleteUser(userId) {
  try {
    const token = tokenOrThrow()
    await deleteAdminUser(token, userId)
    await loadAll()
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
    await loadAll()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to create article'
  }
}

async function handleDeleteArticle(articleId) {
  try {
    const token = tokenOrThrow()
    await deleteAdminKnowledgeArticle(token, articleId)
    await loadAll()
  } catch (nextError) {
    error.value = nextError?.message || 'Failed to delete article'
  }
}

onMounted(loadAll)
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

      <nav class="tabs">
        <button :class="{ active: activeTab === 'risk' }" @click="activeTab = 'risk'">Risk Map</button>
        <button :class="{ active: activeTab === 'reports' }" @click="activeTab = 'reports'">Community Reports</button>
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">Users</button>
        <button :class="{ active: activeTab === 'knowledge' }" @click="activeTab = 'knowledge'">KnowledgeHub</button>
      </nav>

      <section v-if="activeTab === 'risk'" class="panel">
        <h2>Add Manual Risk</h2>
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
        <button class="primary-btn" @click="handleCreateRisk">Create Manual Risk</button>

        <div class="list">
          <article v-for="risk in risks" :key="risk.id">
            <div>
              <strong>{{ risk.title }}</strong>
              <p>{{ risk.type }} · {{ risk.severity }} · {{ risk.coordinates?.[0] }}, {{ risk.coordinates?.[1] }}</p>
            </div>
            <button class="danger-btn" @click="handleArchiveRisk(risk.id)">Archive</button>
          </article>
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
  max-width: 1200px;
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
  margin: 0.7rem 0;
  color: #b42318;
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

.panel {
  margin-top: 0.8rem;
  border: 1px solid #deebe1;
  border-radius: 14px;
  padding: 0.85rem;
}

.panel h2 {
  margin: 0 0 0.6rem;
  color: #163f37;
  font-size: 1.02rem;
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

.primary-btn {
  margin-top: 0.6rem;
  border: none;
  border-radius: 10px;
  padding: 0.58rem 0.8rem;
  color: #fff;
  background: linear-gradient(135deg, #334f2b 0%, #4a6741 100%);
  font-weight: 700;
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

@media (max-width: 900px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid textarea {
    grid-column: span 1;
  }
}
</style>
