import { computed, onMounted, onUnmounted, ref } from 'vue'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { fetchCommunityReports } from '../services/communityReportApi'
import { fetchKnowledgeArticles } from '../services/knowledgeApi'

const severityRank: Record<string, number> = { extreme: 4, high: 3, moderate: 2, low: 1 }
const HOME_PREVIEW_REFRESH_MS = 60_000

export function useHome() {
  const previewLoading = ref(false)
  const previewUpdatedAt = ref<Date | null>(null)
  const previewHazards = ref<any[]>([])

  const communityReportsLoading = ref(false)
  const communityReportsError = ref('')
  const communityAlerts = ref<any[]>([])

  const knowledgeLoading = ref(false)
  const knowledgeError = ref('')
  const knowledgeArticles = ref<any[]>([])

  let previewTimer: ReturnType<typeof setInterval> | null = null

  // ── Computed ──────────────────────────────────────────

  const topPreviewHazards = computed(() =>
    [...previewHazards.value]
      .sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))
      .slice(0, 4),
  )

  const previewTypeSummary = computed(() => {
    const s = { fire: 0, flood: 0, storm: 0, heat: 0, trail: 0, other: 0 }
    previewHazards.value.forEach((h: any) => { if (s[h.type as keyof typeof s] !== undefined) s[h.type as keyof typeof s] += 1 })
    return s
  })

  const heroKnowledgeArticle = computed(() => {
    if (!knowledgeArticles.value.length) return null
    return knowledgeArticles.value.find((item: any) => item.imageUrl) || knowledgeArticles.value[0]
  })

  const knowledgePreviewCards = computed(() => {
    if (!knowledgeArticles.value.length) return []
    const source = [...knowledgeArticles.value]
    const featured = heroKnowledgeArticle.value
    return featured ? source.filter((item: any) => item.id !== featured.id).slice(0, 2) : source.slice(0, 2)
  })

  // ── Helpers ───────────────────────────────────────────

  function formatTimeAgo(input: string | Date): string {
    const ts = input instanceof Date ? input.getTime() : Date.parse(String(input || ''))
    if (!Number.isFinite(ts)) return 'JUST NOW'
    const diffMinutes = Math.max(1, Math.round((Date.now() - ts) / 60000))
    if (diffMinutes < 60) return `${diffMinutes} MIN AGO`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} HOUR${diffHours > 1 ? 'S' : ''} AGO`
    return `${Math.round(diffHours / 24)} DAY${Math.round(diffHours / 24) > 1 ? 'S' : ''} AGO`
  }

  function mapCommunityAlerts(reports: any[] = []): any[] {
    return reports.slice().sort((a: any, b: any) => b.reportedAt.getTime() - a.reportedAt.getTime()).slice(0, 3).map((report: any) => ({
      id: report.id, title: report.title, severity: report.severity,
      location: report.locationName, timeAgo: formatTimeAgo(report.reportedAt),
      details: report.description,
      status: `Reported by ${report.reporterName || 'Anonymous hiker'}` + (Number(report.views || 0) > 0 ? ` · ${report.views} views` : ''),
      replies: Number(report.likes || 0),
    }))
  }

  function getKnowledgeAccent(topic: string): { badge: string; iconColor: string; buttonColor: string; icon: string; cta: string } {
    const t = String(topic || '').toLowerCase()
    if (t.includes('weather')) return { badge: 'bg-secondary/10', iconColor: 'text-secondary', buttonColor: 'text-secondary', icon: 'cloudy_filled', cta: 'Browse Guides' }
    if (t.includes('gear') || t.includes('packing') || t.includes('checklist')) return { badge: 'bg-primary/10', iconColor: 'text-primary', buttonColor: 'text-primary', icon: 'checklist', cta: 'Open Article' }
    if (t.includes('fire') || t.includes('emergency') || t.includes('risk')) return { badge: 'bg-red-100', iconColor: 'text-red-600', buttonColor: 'text-red-600', icon: 'local_fire_department', cta: 'Read Advice' }
    return { badge: 'bg-primary/10', iconColor: 'text-primary', buttonColor: 'text-primary', icon: 'menu_book', cta: 'Read Article' }
  }

  // ── Data loading ──────────────────────────────────────

  async function loadCommunityAlerts(): Promise<void> {
    communityReportsLoading.value = true; communityReportsError.value = ''
    try {
      const payload = await (fetchCommunityReports as any)({ limit: 3, preferCache: true, onUpdate: (p: any) => { communityAlerts.value = mapCommunityAlerts(p.reports) } })
      communityAlerts.value = mapCommunityAlerts(payload.reports)
    } catch (e: any) { communityAlerts.value = []; communityReportsError.value = e?.message || 'Failed to load alerts' }
    finally { communityReportsLoading.value = false }
  }

  async function loadKnowledgePreview(): Promise<void> {
    knowledgeLoading.value = true; knowledgeError.value = ''
    try {
      const list = await (fetchKnowledgeArticles as any)()
      knowledgeArticles.value = list.slice(0, 3)
    } catch (e: any) { knowledgeArticles.value = []; knowledgeError.value = e?.message || 'Failed to load articles' }
    finally { knowledgeLoading.value = false }
  }

  async function loadHomePreview(): Promise<void> {
    previewLoading.value = true
    try {
      const payload = await (fetchRealtimeHazards as any)({ layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'], preferCache: true, onUpdate: (p: any) => { previewHazards.value = p.hazards; previewUpdatedAt.value = p.fetchedAt || p.cachedAt || new Date() } })
      previewHazards.value = payload.hazards; previewUpdatedAt.value = payload.fetchedAt || payload.cachedAt || new Date()
    } catch { previewHazards.value = [] }
    finally { previewLoading.value = false }
  }

  // ── Lifecycle ─────────────────────────────────────────

  onMounted(() => {
    loadHomePreview(); loadCommunityAlerts(); loadKnowledgePreview()
    previewTimer = setInterval(loadHomePreview, HOME_PREVIEW_REFRESH_MS)
  })
  onUnmounted(() => { if (previewTimer) clearInterval(previewTimer) })

  return {
    previewLoading, previewUpdatedAt, previewHazards,
    communityReportsLoading, communityReportsError, communityAlerts,
    knowledgeLoading, knowledgeError, knowledgeArticles,
    topPreviewHazards, previewTypeSummary, heroKnowledgeArticle, knowledgePreviewCards,
    formatTimeAgo, getKnowledgeAccent,
    severityRank: { extreme: 4, high: 3, moderate: 2, low: 1 } as Record<string, number>,
    severityMeta: {
      extreme: { label: 'Extreme', dot: 'bg-red-600', pill: 'bg-red-100 text-red-700' },
      high: { label: 'High', dot: 'bg-orange-500', pill: 'bg-orange-100 text-orange-700' },
      moderate: { label: 'Moderate', dot: 'bg-yellow-500', pill: 'bg-yellow-100 text-yellow-700' },
      low: { label: 'Low', dot: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700' },
    } as Record<string, { label: string; dot: string; pill: string }>,
  }
}
