const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'

function buildApiUrl(path) {
  return `${DEFAULT_BASE_URL}${path}`
}

async function requestJson(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with ${response.status}`)
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
