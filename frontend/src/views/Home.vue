<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import HomeRiskPreviewMap from '../components/HomeRiskPreviewMap.vue'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { fetchCommunityReports } from '../services/communityReportApi'
import { fetchKnowledgeArticles } from '../services/knowledgeApi'

const router = useRouter()
const previewLoading = ref(false)
const previewUpdatedAt = ref(null)
const previewHazards = ref([])
const HOME_PREVIEW_REFRESH_MS = 60_000
let previewTimer

const severityRank = { extreme: 4, high: 3, moderate: 2, low: 1 }
const severityMeta = {
  extreme: { label: 'Extreme', dot: 'bg-red-600', pill: 'bg-red-100 text-red-700' },
  high: { label: 'High', dot: 'bg-orange-500', pill: 'bg-orange-100 text-orange-700' },
  moderate: { label: 'Moderate', dot: 'bg-yellow-500', pill: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700' },
}

const topPreviewHazards = computed(() => {
  return [...previewHazards.value]
    .sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))
    .slice(0, 4)
})

const previewTypeSummary = computed(() => {
  const summary = { fire: 0, flood: 0, storm: 0, heat: 0, trail: 0, other: 0 }
  previewHazards.value.forEach((hazard) => {
    if (summary[hazard.type] !== undefined) summary[hazard.type] += 1
  })
  return summary
})

const communityReportsLoading = ref(false)
const communityReportsError = ref('')
const communityAlerts = ref([])

const knowledgeLoading = ref(false)
const knowledgeError = ref('')
const knowledgeArticles = ref([])

const heroKnowledgeArticle = computed(() => {
  if (!knowledgeArticles.value.length) return null
  return knowledgeArticles.value.find((item) => item.imageUrl) || knowledgeArticles.value[0]
})

const knowledgePreviewCards = computed(() => {
  if (!knowledgeArticles.value.length) return []
  const source = [...knowledgeArticles.value]
  const featured = heroKnowledgeArticle.value
  const filtered = featured ? source.filter((item) => item.id !== featured.id) : source
  return filtered.slice(0, 2)
})

function formatTimeAgo(input) {
  const ts = input instanceof Date ? input.getTime() : Date.parse(String(input || ''))
  if (!Number.isFinite(ts)) return 'JUST NOW'

  const diffMs = Date.now() - ts
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} MIN AGO`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} HOUR${diffHours > 1 ? 'S' : ''} AGO`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`
}

function getCommunityStatus(report) {
  const reporter = report.reporterName || 'Anonymous hiker'
  const views = Number(report.views || 0)
  if (views > 0) return `Reported by ${reporter} · ${views} views`
  return `Reported by ${reporter}`
}

function mapCommunityAlerts(reports = []) {
  return reports
    .slice()
    .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
    .slice(0, 3)
    .map((report) => ({
      id: report.id,
      title: report.title,
      severity: report.severity,
      location: report.locationName,
      timeAgo: formatTimeAgo(report.reportedAt),
      details: report.description,
      status: getCommunityStatus(report),
      replies: Number(report.likes || 0),
    }))
}

function getKnowledgeAccent(topic) {
  const normalized = String(topic || '').toLowerCase()
  if (normalized.includes('weather')) {
    return {
      badge: 'bg-secondary/10',
      iconColor: 'text-secondary',
      buttonColor: 'text-secondary',
      icon: 'cloudy_filled',
      cta: 'Browse Guides',
    }
  }

  if (normalized.includes('gear') || normalized.includes('packing') || normalized.includes('checklist')) {
    return {
      badge: 'bg-primary/10',
      iconColor: 'text-primary',
      buttonColor: 'text-primary',
      icon: 'checklist',
      cta: 'Open Article',
    }
  }

  if (normalized.includes('fire') || normalized.includes('emergency') || normalized.includes('risk')) {
    return {
      badge: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonColor: 'text-red-600',
      icon: 'local_fire_department',
      cta: 'Read Advice',
    }
  }

  return {
    badge: 'bg-primary/10',
    iconColor: 'text-primary',
    buttonColor: 'text-primary',
    icon: 'menu_book',
    cta: 'Read Article',
  }
}

async function loadCommunityAlerts() {
  communityReportsLoading.value = true
  communityReportsError.value = ''

  try {
    const payload = await fetchCommunityReports({
      limit: 3,
      preferCache: true,
      onUpdate: (freshPayload) => {
        communityAlerts.value = mapCommunityAlerts(freshPayload.reports)
      },
    })
    communityAlerts.value = mapCommunityAlerts(payload.reports)
  } catch (error) {
    communityAlerts.value = []
    communityReportsError.value = error?.message || 'Failed to load recent alerts'
  } finally {
    communityReportsLoading.value = false
  }
}

async function loadKnowledgePreview() {
  knowledgeLoading.value = true
  knowledgeError.value = ''

  try {
    const list = await fetchKnowledgeArticles()
    knowledgeArticles.value = list.slice(0, 3)
  } catch (error) {
    knowledgeArticles.value = []
    knowledgeError.value = error?.message || 'Failed to load knowledge articles'
  } finally {
    knowledgeLoading.value = false
  }
}

async function loadHomePreview() {
  previewLoading.value = true
  try {
    const payload = await fetchRealtimeHazards({
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      preferCache: true,
      onUpdate: (freshPayload) => {
        previewHazards.value = freshPayload.hazards
        previewUpdatedAt.value = freshPayload.fetchedAt || freshPayload.cachedAt || new Date()
      },
    })
    previewHazards.value = payload.hazards
    previewUpdatedAt.value = payload.fetchedAt || payload.cachedAt || new Date()
  } catch (_error) {
    previewHazards.value = []
  } finally {
    previewLoading.value = false
  }
}

onMounted(() => {
  loadHomePreview()
  loadCommunityAlerts()
  loadKnowledgePreview()
  previewTimer = window.setInterval(loadHomePreview, HOME_PREVIEW_REFRESH_MS)
})

onUnmounted(() => {
  if (previewTimer) window.clearInterval(previewTimer)
})
</script>

<template>
  <div>
  <main class="home-page">
    <section class="home-hero">
      <div class="home-hero__content">
        <div class="home-hero__copy">
          <p class="home-hero__kicker">Victoria hiking safety</p>
          <h1>Find the safer trail before you leave home.</h1>
          <p>
            HikeShield blends live hazard feeds, route intelligence, and community reports into one calm planning surface for Victorian walkers.
          </p>
          <div class="home-hero__search" role="group" aria-label="Primary planning actions">
            <button class="home-hero__search-main" @click="router.push('/route-planner')">
              <span class="material-symbols-outlined" aria-hidden="true">route</span>
              Plan a safe route
            </button>
            <button class="home-hero__search-icon" aria-label="Open risk map" @click="router.push('/risk-map')">
              <span class="material-symbols-outlined" aria-hidden="true">map</span>
            </button>
          </div>
          <div class="home-hero__stats" aria-label="Live safety summary">
            <div>
              <span>{{ previewHazards.length }}</span>
              <p>active signals</p>
            </div>
            <div>
              <span>{{ topPreviewHazards[0]?.severity ? severityMeta[topPreviewHazards[0].severity]?.label : 'Clear' }}</span>
              <p>highest category</p>
            </div>
            <div>
              <span>{{ previewUpdatedAt ? previewUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--' }}</span>
              <p>last sync</p>
            </div>
          </div>
        </div>

        <div class="home-hero__media" aria-label="Victorian trail preview">
          <img
            alt="Sunlit mountain trail in Victoria"
            src="https://images.pexels.com/photos/34724001/pexels-photo-34724001.jpeg?auto=compress&cs=tinysrgb&w=1600"
          />
          <div class="home-hero__route-card">
            <p>Recommended check</p>
            <strong>Route + risk together</strong>
            <span>Review fire, storm, heat, and trail alerts before committing.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Risk Map Preview & Hazard Bento -->
    <section class="home-section home-risk">
      <div class="home-section__header">
        <div>
          <p class="home-eyebrow">Live risk intelligence</p>
          <h2>Map first. Warnings second. Guesswork never.</h2>
        </div>
        <button class="home-link-btn" @click="router.push('/risk-map')">
          Open full map
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      </div>

      <div class="home-risk__grid">
        <div class="home-map-card">
          <div class="home-map-card__top">
            <span>{{ previewLoading ? 'Syncing live feeds' : `Updated ${previewUpdatedAt ? previewUpdatedAt.toLocaleTimeString() : '--'}` }}</span>
            <button aria-label="Open risk map" @click="router.push('/risk-map')">
              <span class="material-symbols-outlined" aria-hidden="true">open_in_full</span>
            </button>
          </div>
          <div class="home-map-card__map">
            <HomeRiskPreviewMap :hazards="previewHazards" />
            <div class="home-map-card__feed">
              <p>Top active hazards</p>
              <div v-if="topPreviewHazards.length" class="home-map-card__hazards">
                <div
                  v-for="hazard in topPreviewHazards"
                  :key="hazard.id"
                  class="home-map-card__hazard"
                >
                  <div class="min-w-0">
                    <strong>{{ hazard.title }}</strong>
                    <span>
                      {{ hazard.type === 'other' ? 'Other' : hazard.type }} · {{ hazard.source }}
                    </span>
                  </div>
                  <span
                    class="home-severity-pill"
                    :class="severityMeta[hazard.severity]?.pill || severityMeta.low.pill"
                  >
                    {{ severityMeta[hazard.severity]?.label || 'Low' }}
                  </span>
                </div>
              </div>
              <p v-else class="home-empty">No active hazards available from upstream sources right now.</p>
            </div>
          </div>
          <div class="home-risk-chips">
            <span><i style="background:#D84727"></i> Fire {{ previewTypeSummary.fire }}</span>
            <span><i style="background:#2165B5"></i> Flood {{ previewTypeSummary.flood }}</span>
            <span><i style="background:#5A4B81"></i> Storm {{ previewTypeSummary.storm }}</span>
            <span><i style="background:#D08817"></i> Heat {{ previewTypeSummary.heat }}</span>
            <span><i style="background:#6B5C4F"></i> Trail {{ previewTypeSummary.trail }}</span>
            <span><i style="background:#2E7D6B"></i> Other {{ previewTypeSummary.other }}</span>
          </div>
        </div>

        <div class="home-safety-stack">
          <article class="home-warning-card">
            <div>
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
              <small>High risk</small>
            </div>
            <h3>Bushfire readiness</h3>
            <p>
              Fire Danger Ratings dominate trail access from Oct–Apr. Check VicEmergency before you head out.
            </p>
          </article>

          <ul class="home-signal-list">
            <li>
              <span class="material-symbols-outlined" style="color:#2165B5">rainy</span>
              <div><strong>Heavy rain</strong><p>Creek crossings, slippery rock</p></div>
              <small>Moderate</small>
            </li>
            <li>
              <span class="material-symbols-outlined" style="color:#D08817">thermostat</span>
              <div><strong>Heat</strong><p>Exposed ridges, hydrate early</p></div>
              <small>Moderate</small>
            </li>
            <li>
              <span class="material-symbols-outlined" style="color:#6B7280">ac_unit</span>
              <div><strong>Cold weather</strong><p>Alpine wind chill, rapid storms</p></div>
              <small>Low</small>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Community Alerts -->
    <section class="home-section">
      <div class="home-section__header">
        <div>
          <p class="home-eyebrow">Community intelligence</p>
          <h2>Recent reports from the trail.</h2>
        </div>
        <button class="home-link-btn" @click="router.push('/community-reports')">View all reports</button>
      </div>
      <div v-if="communityReportsLoading" class="home-state">
        Loading recent community alerts from the database...
      </div>
      <div v-else-if="communityReportsError" class="home-state home-state--error">
        {{ communityReportsError }}
      </div>
      <div v-else-if="!communityAlerts.length" class="home-state">
        No community alerts have been submitted yet.
      </div>
      <div v-else class="home-alert-grid">
        <article
          v-for="alert in communityAlerts"
          :key="alert.id"
          class="home-alert-card"
        >
          <div class="home-alert-card__top">
            <span
              class="home-severity-pill"
              :class="severityMeta[alert.severity]?.pill || severityMeta.low.pill"
            >
              {{ severityMeta[alert.severity]?.label || 'Low' }}
            </span>
            <span>{{ alert.timeAgo }}</span>
          </div>
          <h3>{{ alert.title }}</h3>
          <p>{{ alert.details }}</p>
          <div class="home-alert-card__meta">
            <strong>{{ alert.location }}</strong>
            <span>{{ alert.status }}</span>
          </div>
          <div class="home-alert-card__footer">
            <span>
              <span class="material-symbols-outlined">chat</span>
              {{ alert.replies }} updates
            </span>
            <button @click="router.push('/community-reports')">Open Thread</button>
          </div>
        </article>
      </div>
      <button class="home-report-btn" @click="router.push('/report-hazard')">
        <span class="material-symbols-outlined">add_circle</span> Report a Hazard
      </button>
    </section>

    <!-- Knowledge Hub Preview -->
    <section class="home-knowledge">
      <div class="home-section">
        <div class="home-section__header">
          <div>
            <p class="home-eyebrow">Knowledge Hub</p>
            <h2>Read before the route gets real.</h2>
          </div>
          <p>Live articles from your database, surfaced on the homepage instead of placeholder content.</p>
        </div>
        <div v-if="knowledgeLoading" class="home-state">
          Loading knowledge articles...
        </div>
        <div v-else-if="knowledgeError" class="home-state home-state--error">
          {{ knowledgeError }}
        </div>
        <div v-else-if="!knowledgeArticles.length" class="home-state">
          No knowledge articles have been published yet.
        </div>
        <div v-else class="home-knowledge-grid">
          <div
            v-for="article in knowledgePreviewCards"
            :key="article.id"
            class="home-knowledge-card"
          >
            <img
              v-if="article.imageUrl"
              :src="article.imageUrl"
              :alt="article.title"
              class="home-knowledge-card__image"
            />
            <div v-else class="home-knowledge-card__image home-knowledge-card__image--empty"></div>
            <div class="home-knowledge-card__body">
              <span>{{ article.topic }}</span>
              <h3>{{ article.title }}</h3>
              <p>{{ article.summary }}</p>
              <button @click="router.push('/knowledge-hub')">
                {{ getKnowledgeAccent(article.topic).cta }}
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>

          <div class="home-knowledge-feature">
            <img
              v-if="heroKnowledgeArticle?.imageUrl"
              class="home-knowledge-feature__image"
              :alt="heroKnowledgeArticle?.title || 'Knowledge article cover'"
              :src="heroKnowledgeArticle.imageUrl"
            />
            <div v-else class="home-knowledge-feature__image home-knowledge-card__image--empty"></div>
            <div class="home-knowledge-feature__body">
              <p>
                {{ heroKnowledgeArticle?.topic || 'Featured Article' }}
              </p>
              <h3>{{ heroKnowledgeArticle?.title || 'Database spotlight' }}</h3>
              <span>
                {{ heroKnowledgeArticle?.summary || 'Homepage hero now points to a real article from your Knowledge Hub.' }}
              </span>
              <button @click="router.push('/knowledge-hub')">Read Stories</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <SiteFooter />
  </div>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: clamp(3rem, 7vw, 5.5rem);
  padding-bottom: clamp(3rem, 6vw, 5rem);
}

.home-hero {
  padding: clamp(1.4rem, 4vw, 3rem) 1rem 0;
  background:
    linear-gradient(180deg, #ffffff 0%, #ffffff 68%, #f7f7f7 100%);
}

.home-hero__content {
  width: min(1220px, calc(100% - 2rem));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(360px, 0.76fr);
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: center;
}

.home-hero__copy {
  max-width: 44rem;
}

.home-hero__kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1.1rem;
  font-size: 0.73rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #2e7d6b;
}

.home-hero h1 {
  margin: 0;
  max-width: 46rem;
  color: #111827;
  font-size: clamp(3rem, 6.6vw, 6rem);
  line-height: 0.98;
  letter-spacing: 0;
}

.home-hero__copy > p:not(.home-hero__kicker) {
  max-width: 38rem;
  margin-top: 1.35rem;
  color: #5f6b7a;
  font-size: clamp(1.02rem, 1.35vw, 1.18rem);
  line-height: 1.7;
}

.home-hero__search {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 2rem;
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 999px;
  background: #ffffff;
  padding: 0.45rem;
  box-shadow: 0 18px 48px rgba(17, 24, 39, 0.1);
}

.home-hero__search-main,
.home-hero__search-icon {
  border: 0;
  cursor: pointer;
}

.home-hero__search-main {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 999px;
  background: #ffffff;
  padding: 0.9rem 1.25rem;
  color: #111827;
  font-weight: 800;
}

.home-hero__search-icon {
  display: grid;
  place-items: center;
  width: 3.1rem;
  height: 3.1rem;
  border-radius: 999px;
  background: #1f6e57;
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(31, 110, 87, 0.24);
}

.home-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  max-width: 36rem;
  margin-top: 2rem;
}

.home-hero__stats div {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 14px;
  background: #ffffff;
  padding: 1rem;
}

.home-hero__stats span {
  display: block;
  color: #111827;
  font-size: clamp(1.4rem, 2.6vw, 2.1rem);
  font-weight: 800;
  line-height: 1;
}

.home-hero__stats p {
  margin-top: 0.45rem;
  color: #8a94a3;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.home-hero__media {
  position: relative;
  min-height: clamp(420px, 52vw, 680px);
  overflow: hidden;
  border-radius: 28px;
  background: #f1f3f5;
  box-shadow: 0 30px 80px rgba(17, 24, 39, 0.16);
}

.home-hero__media img {
  width: 100%;
  height: 100%;
  min-height: inherit;
  object-fit: cover;
}

.home-hero__route-card {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  padding: 1rem;
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(17, 24, 39, 0.16);
}

.home-hero__route-card p,
.home-hero__route-card span {
  color: #5f6b7a;
  font-size: 0.82rem;
}

.home-hero__route-card p {
  margin: 0 0 0.25rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #2e7d6b;
}

.home-hero__route-card strong {
  display: block;
  color: #111827;
  font-size: 1.15rem;
}

.home-section {
  width: min(1220px, calc(100% - 2rem));
  margin: 0 auto;
}

.home-section__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.4rem;
}

.home-section__header h2 {
  max-width: 42rem;
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.04;
}

.home-section__header > p,
.home-section__header div + p {
  max-width: 28rem;
  color: #5f6b7a;
  line-height: 1.65;
}

.home-eyebrow {
  margin-bottom: 0.5rem;
  color: #2e7d6b;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.home-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 999px;
  background: #ffffff;
  padding: 0.72rem 1rem;
  color: #111827;
  font-weight: 800;
  white-space: nowrap;
}

.home-risk__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.7fr);
  gap: 1.2rem;
}

.home-map-card,
.home-warning-card,
.home-signal-list,
.home-alert-card,
.home-knowledge-card,
.home-knowledge-feature {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(17, 24, 39, 0.07);
}

.home-map-card {
  padding: 1rem;
}

.home-map-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.2rem 0.8rem;
  color: #8a94a3;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-map-card__top button {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 999px;
  background: #ffffff;
  color: #1f6e57;
}

.home-map-card__map {
  position: relative;
  height: clamp(360px, 44vw, 500px);
  overflow: hidden;
  border-radius: 12px;
  background: #eef3ef;
}

.home-map-card__feed {
  position: absolute;
  inset-inline: 1rem;
  bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.85rem;
  backdrop-filter: blur(18px);
  box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12);
}

.home-map-card__feed > p {
  margin: 0 0 0.65rem;
  color: #2e7d6b;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.home-map-card__hazards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.home-map-card__hazard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: start;
  border: 1px solid rgba(31, 41, 51, 0.08);
  border-radius: 10px;
  padding: 0.65rem;
  background: #ffffff;
}

.home-map-card__hazard strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-map-card__hazard span {
  display: block;
  margin-top: 0.2rem;
  color: #8a94a3;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-severity-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.52rem;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.home-empty {
  color: #5f6b7a;
  font-size: 0.82rem;
}

.home-risk-chips {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.8rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
}

.home-risk-chips span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(31, 41, 51, 0.08);
  border-radius: 999px;
  background: #f7f7f7;
  padding: 0.55rem 0.75rem;
  color: #5f6b7a;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.home-risk-chips i {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
}

.home-safety-stack {
  display: grid;
  gap: 1rem;
  align-content: start;
}

.home-warning-card {
  padding: 1.25rem;
  background: #fff4f1;
  border-color: #ffd1c8;
}

.home-warning-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.home-warning-card .material-symbols-outlined {
  color: #da1e28;
  font-size: 2.4rem;
}

.home-warning-card small,
.home-signal-list small {
  border-radius: 999px;
  background: #da1e28;
  padding: 0.26rem 0.55rem;
  color: #ffffff;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-warning-card h3 {
  margin-top: 1rem;
  color: #5a1f12;
  font-size: 1.35rem;
}

.home-warning-card p {
  margin-top: 0.45rem;
  color: #7e3b2a;
  font-size: 0.9rem;
  line-height: 1.55;
}

.home-signal-list {
  overflow: hidden;
}

.home-signal-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(31, 41, 51, 0.08);
}

.home-signal-list li:last-child {
  border-bottom: 0;
}

.home-signal-list strong {
  color: #111827;
  font-size: 0.92rem;
}

.home-signal-list p {
  color: #8a94a3;
  font-size: 0.78rem;
}

.home-signal-list small {
  background: #f1f3f5;
  color: #5f6b7a;
}

.home-alert-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.home-alert-card {
  padding: 1.15rem;
}

.home-alert-card__top,
.home-alert-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.home-alert-card__top > span:last-child {
  color: #8a94a3;
  font-size: 0.72rem;
  font-weight: 700;
}

.home-alert-card h3 {
  margin-top: 1rem;
  color: #111827;
  font-size: 1.02rem;
}

.home-alert-card > p {
  margin-top: 0.55rem;
  color: #5f6b7a;
  font-size: 0.88rem;
  line-height: 1.55;
}

.home-alert-card__meta {
  display: grid;
  gap: 0.2rem;
  margin-top: 1rem;
}

.home-alert-card__meta strong {
  color: #1f2933;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-alert-card__meta span {
  color: #8a94a3;
  font-size: 0.78rem;
}

.home-alert-card__footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(31, 41, 51, 0.08);
  color: #8a94a3;
  font-size: 0.78rem;
}

.home-alert-card__footer span {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}

.home-alert-card__footer .material-symbols-outlined {
  font-size: 1rem;
}

.home-alert-card__footer button,
.home-knowledge-card button,
.home-knowledge-feature button {
  border: 0;
  background: transparent;
  color: #1f6e57;
  font-weight: 800;
}

.home-report-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: fit-content;
  margin: 1.25rem auto 0;
  border: 0;
  border-radius: 999px;
  background: #e7f4ed;
  padding: 0.9rem 1.3rem;
  color: #1f6e57;
  font-weight: 900;
}

.home-state {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 14px;
  background: #ffffff;
  padding: 1rem 1.15rem;
  color: #5f6b7a;
  font-size: 0.92rem;
}

.home-state--error {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #be123c;
}

.home-knowledge {
  background: #f7f7f7;
  padding: clamp(3rem, 7vw, 5rem) 0;
}

.home-knowledge-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.home-knowledge-card,
.home-knowledge-feature {
  overflow: hidden;
}

.home-knowledge-card__image,
.home-knowledge-feature__image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: #eef3ef;
}

.home-knowledge-card__image--empty {
  background:
    linear-gradient(135deg, rgba(31, 110, 87, 0.14), rgba(46, 125, 107, 0.14)),
    #eef3ef;
}

.home-knowledge-card__body,
.home-knowledge-feature__body {
  padding: 1.1rem;
}

.home-knowledge-card__body span,
.home-knowledge-feature__body p {
  color: #2e7d6b;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.home-knowledge-card h3,
.home-knowledge-feature h3 {
  margin-top: 0.55rem;
  color: #111827;
  font-size: 1.12rem;
}

.home-knowledge-card p,
.home-knowledge-feature span {
  display: block;
  margin-top: 0.55rem;
  color: #5f6b7a;
  font-size: 0.9rem;
  line-height: 1.55;
}

.home-knowledge-card button,
.home-knowledge-feature button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
}

.home-knowledge-feature {
  min-height: 100%;
}

.home-knowledge-feature__image {
  height: 180px;
}

.home-knowledge-feature__body {
  min-height: 0;
}

.home-knowledge-feature button {
  width: auto;
  border-radius: 0;
  background: transparent;
  padding: 0;
  color: #1f6e57;
}

@media (max-width: 900px) {
  .home-hero__content {
    grid-template-columns: 1fr;
  }

  .home-risk__grid,
  .home-alert-grid,
  .home-knowledge-grid {
    grid-template-columns: 1fr;
  }

  .home-section__header {
    align-items: start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .home-hero {
    padding-inline: 0;
  }

  .home-hero__content {
    width: min(100% - 1.5rem, 1220px);
  }

  .home-hero h1 {
    font-size: clamp(2.75rem, 15vw, 4.2rem);
  }

  .home-hero__search {
    width: 100%;
    justify-content: space-between;
  }

  .home-hero__stats {
    grid-template-columns: 1fr;
  }

  .home-map-card__hazards {
    grid-template-columns: 1fr;
  }

  .home-map-card__feed {
    position: static;
    margin-top: 0.75rem;
  }

  .home-map-card__map {
    height: 300px;
  }
}
</style>
