const CACHE_VERSION = 1

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readJsonCache(key) {
  if (!canUseLocalStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== CACHE_VERSION || !parsed.cachedAt) return null

    const cachedAtTs = Date.parse(parsed.cachedAt)
    if (Number.isNaN(cachedAtTs)) return null

    return {
      cachedAt: new Date(cachedAtTs),
      data: parsed.data,
    }
  } catch {
    return null
  }
}

export function writeJsonCache(key, data) {
  if (!canUseLocalStorage()) return

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: CACHE_VERSION,
        cachedAt: new Date().toISOString(),
        data,
      })
    )
  } catch {
    // ignore storage write failures (quota/private mode/etc.)
  }
}

export function removeJsonCacheByPrefix(prefix) {
  if (!canUseLocalStorage()) return

  try {
    const keys = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(prefix)) keys.push(key)
    }
    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // ignore storage failures
  }
}
