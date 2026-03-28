<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCommunityReports } from '../services/communityReportApi'

const router = useRouter()

const reports = ref([])
const loading = ref(false)
const error = ref('')
const fetchedAt = ref(null)
const storageMode = ref('unknown')

let refreshTimer
let inflightController

const hazardMeta = {
  fire: { label: 'Fire Hazard', color: '#E76F51', icon: 'local_fire_department' },
  flood: { label: 'Flood Warning', color: '#2F7EC1', icon: 'water' },
  storm: { label: 'Weather Impact', color: '#1c4f51', icon: 'rainy' },
  trail: { label: 'Trail Caution', color: '#6b5c4f', icon: 'warning' },
  other: { label: 'General Alert', color: '#5A6B5F', icon: 'campaign' },
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

const markerReports = computed(() => {
  const latMin = -39.4
  const latMax = -34.0
  const lngMin = 140.9
  const lngMax = 150.1

  return sortedReports.value.map((item) => {
    const lngRatio = (item.longitude - lngMin) / (lngMax - lngMin)
    const latRatio = 1 - (item.latitude - latMin) / (latMax - latMin)

    const x = Math.max(0.06, Math.min(0.94, Number.isFinite(lngRatio) ? lngRatio : 0.5))
    const y = Math.max(0.08, Math.min(0.92, Number.isFinite(latRatio) ? latRatio : 0.5))

    return {
      ...item,
      x,
      y,
      meta: hazardMeta[item.hazardType] || hazardMeta.other,
    }
  })
})

function getMeta(report) {
  return hazardMeta[report.hazardType] || hazardMeta.other
}

function formatCount(value) {
  const num = Number(value || 0)
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k'
  return String(num)
}

function formatRelativeTime(date) {
  const reportedTs = date instanceof Date ? date.getTime() : Date.parse(date || '')
  if (!Number.isFinite(reportedTs)) return 'Unknown time'

  const deltaSec = Math.max(0, Math.floor((Date.now() - reportedTs) / 1000))
  if (deltaSec < 60) return deltaSec + 's ago'
  if (deltaSec < 3600) return Math.floor(deltaSec / 60) + 'm ago'
  if (deltaSec < 86400) return Math.floor(deltaSec / 3600) + 'h ago'
  return Math.floor(deltaSec / 86400) + 'd ago'
}

async function loadReports() {
  if (inflightController) inflightController.abort()
  inflightController = new AbortController()
  loading.value = true
  error.value = ''

  try {
    const payload = await fetchCommunityReports({
      limit: 80,
      signal: inflightController.signal,
    })
    reports.value = payload.reports
    fetchedAt.value = payload.fetchedAt
    storageMode.value = payload.storage
  } catch (loadError) {
    if (loadError?.name === 'AbortError') return
    error.value = loadError?.message || 'Failed to fetch reports'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadReports()
  refreshTimer = window.setInterval(loadReports, 60000)
})

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (inflightController) inflightController.abort()
})
</script>

<template>
  <div class="flex flex-col" style="height: calc(100vh - 72px)">
    <main class="flex-1 flex overflow-hidden relative">
      <aside class="w-full md:w-[430px] bg-surface-container-low flex flex-col z-20 shadow-xl md:shadow-none">
        <div class="p-6 border-b border-outline-variant/20 space-y-4">
          <div class="flex justify-between items-end gap-4">
            <div>
              <h1 class="text-3xl font-headline font-extrabold tracking-tight text-primary">Community Reports</h1>
              <p class="text-xs text-on-surface-variant font-medium mt-1">
                {{ stats.total }} reports · Last sync: {{ fetchedAt ? fetchedAt.toLocaleTimeString() : '—' }}
              </p>
            </div>
            <span class="text-[10px] font-label font-medium bg-primary-container/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
              {{ storageMode === 'database' ? 'Railway DB' : 'Memory Fallback' }}
            </span>
          </div>

          <div class="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
            <div class="rounded-lg bg-red-50 text-red-700 px-2 py-2">E {{ stats.extreme }}</div>
            <div class="rounded-lg bg-orange-50 text-orange-700 px-2 py-2">H {{ stats.high }}</div>
            <div class="rounded-lg bg-amber-50 text-amber-700 px-2 py-2">M {{ stats.moderate }}</div>
            <div class="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-2">L {{ stats.low }}</div>
          </div>

          <button
            class="w-full py-2 px-4 rounded-lg bg-primary text-on-primary font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            @click="router.push('/report-hazard')"
          >
            <span class="material-symbols-outlined text-sm">add_circle</span>
            Submit Report
          </button>

          <p v-if="error" class="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {{ error }}
          </p>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-surface-container-low">
          <div v-if="loading && !sortedReports.length" class="text-sm text-on-surface-variant">Loading reports...</div>

          <div
            v-for="report in sortedReports"
            :key="report.id"
            class="group bg-surface-container-lowest rounded-xl p-4 transition-all duration-300 hover:bg-surface-bright border-l-4"
            :style="{ borderColor: getMeta(report).color }"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getMeta(report).color }"></span>
              <span class="text-[10px] font-label font-bold uppercase tracking-widest" :style="{ color: getMeta(report).color }">
                {{ getMeta(report).label }}
              </span>
              <span class="ml-auto text-[10px] uppercase font-bold text-on-surface-variant">{{ report.severity }}</span>
            </div>

            <h3 class="font-headline font-bold text-on-surface leading-tight">{{ report.title }}</h3>
            <p class="text-xs text-on-surface-variant font-medium mt-1">
              {{ report.locationName }} · {{ formatRelativeTime(report.reportedAt) }}
            </p>
            <p class="text-xs text-on-surface-variant mt-2 leading-relaxed">{{ report.description }}</p>

            <div class="flex items-center gap-3 mt-3 text-[10px] font-bold text-slate-500">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">thumb_up</span> {{ formatCount(report.likes) }}
              </span>
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">visibility</span> {{ formatCount(report.views) }}
              </span>
              <span class="ml-auto">{{ report.reporterName }}</span>
            </div>
          </div>

          <div v-if="!loading && !sortedReports.length" class="text-sm text-on-surface-variant">
            No reports yet. Be the first to submit one.
          </div>
        </div>
      </aside>

      <section class="flex-1 relative bg-[#e5e5f7] overflow-hidden hidden md:block">
        <div class="absolute inset-0 z-0">
          <img
            class="w-full h-full object-cover opacity-80 mix-blend-multiply grayscale-[20%]"
            alt="Topographic map of Victoria"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnpDiY-W_u-7FF6aOXRQbek5VwW_hTWMQYnDL40UVGg9twyDJG_PnbtNXXzwfZcl8eHBizV-CvDl4_pFCJ-EkoyNSk9M6Ac4iWRBzQNOMbqxP56mlU9i-hN00i2KSOa6gX2Lwvcp6-M119i7KqeKj_jmxCQetWPJRG7gfLurvFfmv4Q9mAqqw93Pu2-mjksLcqWWvPnZm2MtixXhB-TFKDRMHQ5l3_xt0fcMjz7-B5gYi1HnhnzTNzaEkOR6FKfMdytWtZJNUKDyE"
          />
          <div class="absolute inset-0 bg-primary/5"></div>
        </div>

        <div
          v-for="report in markerReports"
          :key="'marker-' + report.id"
          class="absolute z-10 group cursor-pointer"
          :style="{ left: report.x * 100 + '%', top: report.y * 100 + '%', transform: 'translate(-50%, -50%)' }"
        >
          <div class="relative">
            <div
              v-if="report.severity === 'extreme' || report.severity === 'high'"
              class="absolute -inset-4 rounded-full animate-ping"
              :style="{ backgroundColor: report.meta.color + '33' }"
            ></div>
            <div
              class="bg-surface-container-lowest p-2 rounded-full shadow-xl border-2 flex items-center justify-center group-hover:scale-125 transition-transform duration-300"
              :style="{ borderColor: report.meta.color }"
            >
              <span class="material-symbols-outlined" :style="{ color: report.meta.color }">
                {{ report.meta.icon }}
              </span>
            </div>
            <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-on-surface text-surface text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold">
              {{ report.title }}
            </div>
          </div>
        </div>

        <div class="absolute top-8 left-8 z-30">
          <div class="bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-outline-variant/10 max-w-xs">
            <h4 class="font-headline font-extrabold text-primary mb-3 text-sm">Legend</h4>
            <div class="space-y-3">
              <div v-for="(meta, key) in hazardMeta" :key="key" class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ backgroundColor: meta.color + '20' }">
                  <span class="material-symbols-outlined text-sm" :style="{ color: meta.color }">{{ meta.icon }}</span>
                </span>
                <span class="text-xs font-medium text-on-surface-variant">{{ meta.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
