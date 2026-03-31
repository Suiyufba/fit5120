const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'

function buildApiUrl(path) {
  return `${DEFAULT_BASE_URL}${path}`
}

function isProfileWritePath(path) {
  return path === '/auth/profile' || path === '/auth/profile/sensitive'
}

async function requestJson(path, { method = 'GET', token, body } = {}) {
  const url = buildApiUrl(path)
  let response
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (_error) {
    throw new Error('Network error: failed to reach backend API')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const backendMessage = String(payload?.error || '').trim()

    if (response.status === 401 && isProfileWritePath(path)) {
      throw new Error('Session expired. Please sign in again.')
    }

    if (response.status === 404 && isProfileWritePath(path)) {
      if (backendMessage.toLowerCase() === 'user not found') {
        throw new Error('Account record was not found. Please sign in again and try once more.')
      }

      if (backendMessage) {
        throw new Error(backendMessage)
      }

      throw new Error(`Profile update failed because ${url} is unavailable on the current backend deployment.`)
    }

    throw new Error(backendMessage || `Request failed with ${response.status}`)
  }

  return payload
}

export function registerUser(payload) {
  return requestJson('/auth/register', { method: 'POST', body: payload })
}

export function loginUser(payload) {
  return requestJson('/auth/login', { method: 'POST', body: payload })
}

export function fetchCurrentUser(token) {
  return requestJson('/auth/me', { token })
}

export function confirmPasswordReset(payload) {
  return requestJson('/auth/password-reset/security', { method: 'POST', body: payload })
}

export function updateCurrentUserProfile(token, payload) {
  return requestJson('/auth/profile', { method: 'PUT', token, body: payload })
}

export function updateCurrentUserSensitiveProfile(token, payload) {
  return requestJson('/auth/profile/sensitive', { method: 'PUT', token, body: payload })
}
