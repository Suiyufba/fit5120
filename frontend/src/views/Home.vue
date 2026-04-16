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
    else summary.other += 1
  })
  return summary
})

const previewOtherCategorySummary = computed(() => {
  const groups = {}
  previewHazards.value
    .filter((hazard) => hazard.type === 'other')
    .forEach((hazard) => {
      const key = String(hazard.riskCategory || 'Unspecified').trim() || 'Unspecified'
      groups[key] = (groups[key] || 0) + 1
    })

  return Object.entries(groups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
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
    <section class="relative px-4 md:px-8 pt-10 md:pt-24 overflow-hidden">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 md:gap-12 items-center">
        <div class="w-full md:w-1/2 z-10">
          <span class="text-xs font-label uppercase tracking-[0.2em] text-primary mb-4 block">Official Victorian Safety Guide</span>
          <h1 class="text-4xl sm:text-5xl md:text-7xl font-headline font-extrabold text-on-surface leading-tight mb-6 md:mb-8">
            Hike with <span class="gradient-text">Confidence</span> in Victoria.
          </h1>
          <div class="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
            <button
              class="primary-gradient text-on-primary px-6 md:px-8 py-4 rounded-lg font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:opacity-90 transition-all"
              @click="router.push('/risk-map')"
            >
              <span class="material-symbols-outlined">map</span> Check Risk Map
            </button>
            <button
              class="bg-surface-container-high text-primary px-6 md:px-8 py-4 rounded-lg font-bold border-2 border-primary/10 hover:bg-surface-container-highest transition-all"
              @click="router.push('/route-planner')"
            >
              Plan My Route
            </button>
          </div>
        </div>
        <div class="w-full md:w-1/2 relative">
          <div class="aspect-[1/1] sm:aspect-square rounded-[1.6rem] md:rounded-[2rem] overflow-hidden bg-surface-container-high rotate-0 md:rotate-3 hover:rotate-0 transition-transform duration-500">
            <img
              class="w-full h-full object-cover"
              alt="Stunning aerial view of the rugged Grampians National Park in Victoria"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmNyB922YneY1cbo22Sttfq74UspbMx6Vrm-cr5xzgB9OfhoGhfly1s-GFQUpk1yLdxJESMHIccLvddetSCEwmU519zR9aV38SFNj_QpO4O-ippvOXQhrAl8K3lAoNTtrTk86KAEKNXoWKZXZZV7tQGlSkwH9C-6eukOcdWi6jW6iooq9zRGM513df6ITqsjlEqL8ucroqiBNahzq-UQCYyukUlfLXUtKQnsW89abQApWV8cs_4I0yWhFWgelNSH3UwMC734-x3vc"
            />
          </div>
          <div class="absolute bottom-4 left-4 md:-bottom-6 md:-left-6 bg-glass bg-white/80 p-4 md:p-6 rounded-2xl shadow-2xl backdrop-blur-md max-w-[220px] md:max-w-[240px] border border-white/40">
            <div class="flex items-center gap-3 mb-2">
              <span class="w-3 h-3 rounded-full bg-error animate-pulse"></span>
              <span class="font-bold text-sm">Active Warning</span>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">Extreme heat predicted for the High Country trails this weekend. Stay hydrated.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Risk Map Preview & Hazard Bento -->
    <section class="px-4 md:px-8 max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div class="md:col-span-8 bg-surface-container-low rounded-[2rem] p-4 flex flex-col gap-6 group border border-[#d7e5d8]">
          <div class="flex justify-between items-center px-4 pt-2">
            <h2 class="font-headline font-bold text-2xl">Live Risk Map Preview</h2>
            <div class="flex items-center gap-3">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {{ previewLoading ? 'Syncing…' : `Updated ${previewUpdatedAt ? previewUpdatedAt.toLocaleTimeString() : '--'}` }}
              </span>
              <span class="material-symbols-outlined text-primary cursor-pointer" @click="router.push('/risk-map')">open_in_full</span>
            </div>
          </div>
          <div class="relative w-full h-[320px] sm:h-[380px] md:h-[420px] rounded-[1.5rem] overflow-hidden bg-surface-dim border border-white/60">
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
                      {{ hazard.type === 'other' ? (hazard.riskCategory || 'other') : hazard.type }} · {{ hazard.source }}
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
            <span
              v-for="[category, count] in previewOtherCategorySummary"
              :key="category"
              class="flex items-center gap-2 text-xs font-medium py-2 px-4 bg-[#edf4ef] rounded-full whitespace-nowrap text-[#31544a]"
            >
              {{ category }} {{ count }}
            </span>
          </div>
        </div>

        <div class="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4">
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-error mb-4" style="font-variation-settings: 'FILL' 1">local_fire_department</span>
            <div>
              <p class="font-headline font-bold text-lg">Bushfire</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded uppercase tracking-wider">High Risk</span>
            </div>
          </div>
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-blue-500 mb-4" style="font-variation-settings: 'FILL' 1">rainy</span>
            <div>
              <p class="font-headline font-bold text-lg">Heavy Rain</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">Moderate</span>
            </div>
          </div>
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-yellow-600 mb-4" style="font-variation-settings: 'FILL' 1">thermostat</span>
            <div>
              <p class="font-headline font-bold text-lg">Heat</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase tracking-wider">Moderate</span>
            </div>
          </div>
          <div class="bg-surface-container-low p-6 rounded-[2rem] flex flex-col justify-between hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-4xl text-cyan-600 mb-4" style="font-variation-settings: 'FILL' 1">ac_unit</span>
            <div>
              <p class="font-headline font-bold text-lg">Cold Weather</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded uppercase tracking-wider">Low Risk</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Community Alerts -->
    <section class="px-4 md:px-8 max-w-7xl mx-auto">
      <div class="flex items-baseline justify-between mb-8">
        <h2 class="font-headline font-bold text-3xl">Recent Community Alerts</h2>
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
          <h2 class="font-headline font-bold text-3xl mb-4">Knowledge Hub</h2>
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
