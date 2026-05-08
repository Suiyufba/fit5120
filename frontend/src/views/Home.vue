<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import HomeRiskPreviewMap from '../components/HomeRiskPreviewMap.vue'
import HomeHeroThreeBackdrop from '../components/HomeHeroThreeBackdrop.vue'
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
  <main class="space-y-12 md:space-y-16 pb-16 md:pb-20">
    <!-- Hero Section -->
    <section class="home-hero">
      <div class="home-hero__media">
        <img
          alt="Golden mountain trail through Victorian bushland"
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=82"
        />
        <HomeHeroThreeBackdrop />
      </div>
      <div class="home-hero__overlay"></div>
      <div class="home-hero__content">
        <div class="home-hero__copy">
          <span class="home-hero__kicker">
            <span></span>Premium Victorian Safety Guide
          </span>
          <h1>
            Hike Victoria with quiet <span>confidence.</span>
          </h1>
          <p>
            Plan safer routes, read live risk layers, and move through the outdoors with official data and community intelligence in one refined trail companion.
          </p>
          <div class="home-hero__actions">
            <button
              class="hs-button-primary px-6 md:px-8 py-4"
              @click="router.push('/risk-map')"
            >
              <span class="material-symbols-outlined">map</span> Check Risk Map
            </button>
            <button
              class="hs-button-secondary px-6 md:px-8 py-4"
              @click="router.push('/route-planner')"
            >
              <span class="material-symbols-outlined">route</span> Plan My Route
            </button>
          </div>
        </div>
        <div class="home-hero__panel">
          <div>
            <p>Live safety pulse</p>
            <strong>{{ previewHazards.length }}</strong>
            <span>active signals</span>
          </div>
          <div>
            <p>Highest category</p>
            <strong>{{ topPreviewHazards[0]?.severity ? severityMeta[topPreviewHazards[0].severity]?.label : 'Clear' }}</strong>
            <span>{{ previewUpdatedAt ? `updated ${previewUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'syncing data' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Risk Map Preview & Hazard Bento -->
    <section class="px-4 md:px-8 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div class="md:col-span-8 hs-card rounded-[1.25rem] p-4 flex flex-col gap-6 group">
          <div class="flex justify-between items-center px-4 pt-2">
            <h2 class="font-display text-[1.7rem] sm:text-[2rem] font-semibold tracking-[-0.012em]">Live Risk Map Preview</h2>
            <div class="flex items-center gap-3">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {{ previewLoading ? 'Syncing…' : `Updated ${previewUpdatedAt ? previewUpdatedAt.toLocaleTimeString() : '--'}` }}
              </span>
              <span class="material-symbols-outlined text-primary cursor-pointer" @click="router.push('/risk-map')">open_in_full</span>
            </div>
          </div>
          <div class="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-[1rem] overflow-hidden bg-surface-dim border border-white/60">
            <HomeRiskPreviewMap :hazards="previewHazards" />
            <div class="absolute inset-x-4 bottom-4 bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/70">
              <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#31544a] mb-2">Top Active Hazards</p>
              <div v-if="topPreviewHazards.length" class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div
                  v-for="hazard in topPreviewHazards"
                  :key="hazard.id"
                  class="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-start justify-between gap-3"
                >
                  <div class="min-w-0">
                    <p class="text-[12px] font-semibold text-slate-800 truncate">{{ hazard.title }}</p>
                    <p class="text-[10px] text-slate-500 uppercase tracking-wide">
                      {{ hazard.type === 'other' ? 'Other' : hazard.type }} · {{ hazard.source }}
                    </p>
                  </div>
                  <span
                    class="text-[10px] font-bold px-2 py-1 rounded-full uppercase whitespace-nowrap"
                    :class="severityMeta[hazard.severity]?.pill || severityMeta.low.pill"
                  >
                    {{ severityMeta[hazard.severity]?.label || 'Low' }}
                  </span>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500">No active hazards available from upstream sources right now.</p>
            </div>
          </div>
          <div class="flex gap-4 px-4 pb-2 overflow-x-auto">
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-error"></span> Fire {{ previewTypeSummary.fire }}
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span> Flood {{ previewTypeSummary.flood }}
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-violet-500"></span> Storm {{ previewTypeSummary.storm }}
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span> Heat {{ previewTypeSummary.heat }}
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-stone-500"></span> Trail {{ previewTypeSummary.trail }}
            </span>
            <span class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-surface-container-high rounded-full whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-emerald-600"></span> Other {{ previewTypeSummary.other }}
            </span>
          </div>
        </div>

        <div class="md:col-span-4 flex flex-col gap-4">
          <!-- Dominant hazard tile: Bushfire is the defining risk for Victorian summer hikes -->
          <article class="relative p-6 rounded-[1rem] bg-[#fff4ed] border border-[#f1cdb8] overflow-hidden shadow-sm">
            <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-error/10 blur-2xl pointer-events-none"></div>
            <div class="relative flex items-start justify-between gap-3 mb-4">
              <span class="material-symbols-outlined text-[2.75rem] text-error leading-none" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
              <span class="text-[10px] font-bold px-2.5 py-1 bg-error text-white rounded-full uppercase tracking-[0.12em]">High Risk</span>
            </div>
            <p class="font-display text-2xl font-semibold text-[#5a1f12] leading-tight mb-1">Bushfire</p>
            <p class="text-[12.5px] text-[#7e3b2a] leading-relaxed">
              Fire Danger Ratings dominate trail access from Oct–Apr. Check VicEmergency before you head out.
            </p>
          </article>

          <!-- Quieter row of secondary hazards — no repeated card template -->
          <ul class="divide-y divide-[#dce7dd] border border-[#dce7dd] rounded-[1rem] bg-white overflow-hidden shadow-sm">
            <li class="flex items-center gap-4 px-5 py-4">
              <span class="material-symbols-outlined text-[1.75rem] text-blue-500 shrink-0" style="font-variation-settings: 'FILL' 1">rainy</span>
              <div class="min-w-0 flex-1">
                <p class="font-headline font-semibold text-[15px] text-on-surface">Heavy Rain</p>
                <p class="text-[11px] text-slate-500">Creek crossings, slippery rock</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">Moderate</span>
            </li>
            <li class="flex items-center gap-4 px-5 py-4">
              <span class="material-symbols-outlined text-[1.75rem] text-yellow-600 shrink-0" style="font-variation-settings: 'FILL' 1">thermostat</span>
              <div class="min-w-0 flex-1">
                <p class="font-headline font-semibold text-[15px] text-on-surface">Heat</p>
                <p class="text-[11px] text-slate-500">Exposed ridges, hydrate early</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full uppercase tracking-wider">Moderate</span>
            </li>
            <li class="flex items-center gap-4 px-5 py-4">
              <span class="material-symbols-outlined text-[1.75rem] text-slate-500 shrink-0" style="font-variation-settings: 'FILL' 1">ac_unit</span>
              <div class="min-w-0 flex-1">
                <p class="font-headline font-semibold text-[15px] text-on-surface">Cold Weather</p>
                <p class="text-[11px] text-slate-500">Alpine wind chill, rapid storms</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider">Low</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Community Alerts -->
    <section class="px-4 md:px-8 max-w-7xl mx-auto">
      <div class="flex items-baseline justify-between mb-8">
        <h2 class="font-display text-[2rem] sm:text-[2.4rem] font-semibold tracking-[-0.012em]">Recent Community Alerts</h2>
        <button class="text-primary font-bold text-sm hover:underline" @click="router.push('/community-reports')">View all reports</button>
      </div>
      <div v-if="communityReportsLoading" class="rounded-2xl border border-[#dce7dd] bg-white px-6 py-5 text-sm text-slate-500">
        Loading recent community alerts from the database...
      </div>
      <div v-else-if="communityReportsError" class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
        {{ communityReportsError }}
      </div>
      <div v-else-if="!communityAlerts.length" class="rounded-2xl border border-[#dce7dd] bg-white px-6 py-5 text-sm text-slate-500">
        No community alerts have been submitted yet.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article
          v-for="alert in communityAlerts"
          :key="alert.id"
          class="bg-white p-6 rounded-2xl border border-[#dce7dd] shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between mb-3">
            <span
              class="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
              :class="severityMeta[alert.severity]?.pill || severityMeta.low.pill"
            >
              {{ severityMeta[alert.severity]?.label || 'Low' }}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">{{ alert.timeAgo }}</span>
          </div>
          <h3 class="font-bold text-[1.02rem] leading-tight text-[#213d36]">{{ alert.title }}</h3>
          <p class="mt-2 text-xs text-[#4f6a62]">{{ alert.details }}</p>
          <div class="mt-4 space-y-2">
            <p class="text-[11px] font-semibold text-[#39594f] uppercase tracking-wide">{{ alert.location }}</p>
            <p class="text-[11px] text-slate-500">{{ alert.status }}</p>
          </div>
          <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">chat</span>
              {{ alert.replies }} updates
            </span>
            <button class="font-semibold text-primary hover:underline" @click="router.push('/community-reports')">Open Thread</button>
          </div>
        </article>
      </div>
      <div class="mt-6 md:mt-8 flex justify-center">
        <button
          class="flex items-center justify-center gap-2 w-full sm:w-auto px-8 md:px-12 py-4 bg-surface-container-high rounded-full font-bold text-primary hover:bg-surface-container-highest transition-all"
          @click="router.push('/report-hazard')"
        >
          <span class="material-symbols-outlined">add_circle</span> Report a Hazard
        </button>
      </div>
    </section>

    <!-- Knowledge Hub Preview -->
    <section class="bg-surface-container-low py-16 md:py-20 px-4 md:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-12 text-center md:text-left">
          <h2 class="font-display text-[2rem] sm:text-[2.4rem] font-semibold tracking-[-0.012em] mb-4">Knowledge Hub</h2>
          <p class="text-on-surface-variant max-w-xl">Live articles from your database, surfaced on the homepage instead of placeholder content.</p>
        </div>
        <div v-if="knowledgeLoading" class="rounded-[2rem] border border-[#dce7dd] bg-white px-6 py-5 text-sm text-slate-500">
          Loading knowledge articles...
        </div>
        <div v-else-if="knowledgeError" class="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          {{ knowledgeError }}
        </div>
        <div v-else-if="!knowledgeArticles.length" class="rounded-[2rem] border border-[#dce7dd] bg-white px-6 py-5 text-sm text-slate-500">
          No knowledge articles have been published yet.
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="article in knowledgePreviewCards"
            :key="article.id"
            class="relative rounded-[2rem] overflow-hidden min-h-[320px] shadow-sm hover:translate-y-[-4px] transition-transform group"
          >
            <img
              v-if="article.imageUrl"
              :src="article.imageUrl"
              :alt="article.title"
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div v-else class="absolute inset-0 bg-[radial-gradient(circle_at_top,#d9ece2_0%,#8db7a5_35%,#31544a_100%)]"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-[#17352d]/95 via-[#21453b]/72 to-[#21453b]/25"></div>
            <div class="relative z-10 flex h-full flex-col justify-end p-8">
              <div
                class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/18 backdrop-blur-sm"
              >
                <span
                  class="material-symbols-outlined text-white"
                >
                  {{ getKnowledgeAccent(article.topic).icon }}
                </span>
              </div>
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {{ article.topic }}
              </p>
              <h3 class="mb-4 font-headline text-xl font-bold text-white">{{ article.title }}</h3>
              <p class="mb-8 flex-1 text-sm leading-relaxed text-white/82">
                {{ article.summary }}
              </p>
              <button
                class="flex items-center gap-2 text-left text-sm font-bold text-white group-hover:text-white"
                @click="router.push('/knowledge-hub')"
              >
                {{ getKnowledgeAccent(article.topic).cta }}
                <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>

          <div class="relative rounded-[2rem] overflow-hidden group h-full min-h-[320px]">
            <img
              v-if="heroKnowledgeArticle?.imageUrl"
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              :alt="heroKnowledgeArticle?.title || 'Knowledge article cover'"
              :src="heroKnowledgeArticle.imageUrl"
            />
            <div v-else class="absolute inset-0 bg-[radial-gradient(circle_at_top,#8db7a5_0%,#3f6a5a_45%,#203d35_100%)]"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-8">
              <p class="text-white/70 text-[11px] font-semibold uppercase tracking-[0.18em] mb-3">
                {{ heroKnowledgeArticle?.topic || 'Featured Article' }}
              </p>
              <h3 class="text-white font-headline font-bold text-xl mb-2">{{ heroKnowledgeArticle?.title || 'Database spotlight' }}</h3>
              <p class="text-white/80 text-sm mb-6">
                {{ heroKnowledgeArticle?.summary || 'Homepage hero now points to a real article from your Knowledge Hub.' }}
              </p>
              <button class="bg-white text-primary px-6 py-3 rounded-full font-bold text-sm w-fit" @click="router.push('/knowledge-hub')">Read Stories</button>
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
.home-hero {
  position: relative;
  min-height: clamp(620px, calc(100vh - 72px), 820px);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  isolation: isolate;
  margin-bottom: 1.5rem;
}

.home-hero__media,
.home-hero__overlay {
  position: absolute;
  inset: 0;
}

.home-hero__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.02);
  opacity: 0.34;
}

.home-hero__overlay {
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(13, 35, 29, 0.9) 0%, rgba(13, 35, 29, 0.62) 42%, rgba(13, 35, 29, 0.16) 100%),
    linear-gradient(0deg, rgba(13, 35, 29, 0.72), transparent 44%);
}

.home-hero__content {
  position: relative;
  z-index: 2;
  width: min(1220px, calc(100% - 2rem));
  margin: 0 auto;
  padding: clamp(2rem, 5vw, 5rem) 0;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(280px, 0.34fr);
  gap: clamp(1.25rem, 4vw, 4rem);
  align-items: end;
}

.home-hero__copy {
  max-width: 48rem;
  color: #fffaf2;
}

.home-hero__kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1.3rem;
  font-size: 0.73rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 250, 242, 0.82);
}

.home-hero__kicker span {
  width: 2rem;
  height: 1px;
  background: currentColor;
}

.home-hero h1 {
  max-width: 54rem;
  margin: 0;
  color: #fffaf2;
  font-size: clamp(3.1rem, 6.8vw, 6.55rem);
  line-height: 1.04;
  letter-spacing: -0.035em;
}

.home-hero h1 span {
  color: #d9e8cf;
}

.home-hero p {
  max-width: 39rem;
  margin-top: 1.5rem;
  color: rgba(255, 250, 242, 0.78);
  font-size: clamp(1rem, 1.35vw, 1.18rem);
  line-height: 1.7;
}

.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 2rem;
}

.home-hero__panel {
  display: grid;
  gap: 0.8rem;
  border: 1px solid rgba(255, 250, 242, 0.28);
  border-radius: 1.25rem;
  background: rgba(255, 250, 242, 0.82);
  padding: 1rem;
  color: #173b31;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
}

.home-hero__panel div {
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.64);
  padding: 1rem;
}

.home-hero__panel p,
.home-hero__panel span {
  margin: 0;
  color: #687d72;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-hero__panel strong {
  display: block;
  margin: 0.25rem 0;
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1;
  color: #173b31;
}

@media (max-width: 900px) {
  .home-hero {
    min-height: auto;
  }

  .home-hero__content {
    grid-template-columns: 1fr;
    padding-top: 7rem;
  }

  .home-hero__panel {
    max-width: 28rem;
  }
}

@media (max-width: 640px) {
  .home-hero__content {
    width: min(100% - 1.5rem, 1220px);
    padding-bottom: 2rem;
  }

  .home-hero h1 {
    font-size: clamp(3rem, 17vw, 4.4rem);
    line-height: 1.03;
  }

  .home-hero__actions {
    flex-direction: column;
  }
}
</style>
