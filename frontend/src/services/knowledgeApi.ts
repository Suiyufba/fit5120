const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://backend-production-f55c.up.railway.app/api'

function normalizeArticle(item: Record<string, unknown>, index: number) {
  const title = String(item?.title || '').trim()
  const content = String(item?.content || '').trim()
  if (!title || !content) return null

  return {
    id: String(item?.id || `article-${index}`),
    title,
    summary: String(item?.summary || '').trim() || content.slice(0, 140),
    content,
    imageUrl: String(item?.imageUrl || '').trim(),
    topic: String(item?.topic || 'General').trim(),
    readMinutes: Number(item?.readMinutes) > 0 ? Number(item.readMinutes) : 5,
    publishedAt: item?.publishedAt || '',
    sourceUrl: String(item?.sourceUrl || '').trim(),
    isFeatured: Boolean(item?.isFeatured),
  }
}

export async function fetchKnowledgeArticles({ topic, signal }: { topic?: string; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams()
  if (topic && topic !== 'all') params.set('topic', topic)
  const url = params.size
    ? `${DEFAULT_BASE_URL}/knowledge/articles?${params.toString()}`
    : `${DEFAULT_BASE_URL}/knowledge/articles`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || `Knowledge API failed (${response.status})`)
  }

  const list = Array.isArray(payload?.articles) ? payload.articles : []
  return list.map(normalizeArticle).filter(Boolean)
}
