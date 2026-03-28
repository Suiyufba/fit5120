const BASE_URL =
  (import.meta.env.VITE_HAZARD_API_BASE_URL || '').trim() || 'https://backend-production-f55c.up.railway.app/api'

function apiUrl(path) {
  return BASE_URL.replace(/\/+$/, '') + path
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`)
  }
  return payload
}

export function fetchAdminOverview(token) {
  return request('/admin/overview', { token })
}

export function fetchAdminRisks(token) {
  return request('/admin/risks', { token })
}

export function createAdminRisk(token, payload) {
  return request('/admin/risks', { method: 'POST', token, body: payload })
}

export function updateAdminRisk(token, riskId, payload) {
  return request(`/admin/risks/${riskId}`, { method: 'PUT', token, body: payload })
}

export function archiveAdminRisk(token, riskId) {
  return request(`/admin/risks/${riskId}`, { method: 'DELETE', token })
}

export function fetchAdminCommunityReports(token) {
  return request('/admin/community-reports', { token })
}

export function createAdminCommunityReport(token, payload) {
  return request('/admin/community-reports', { method: 'POST', token, body: payload })
}

export function updateAdminCommunityReport(token, reportId, payload) {
  return request(`/admin/community-reports/${reportId}`, { method: 'PUT', token, body: payload })
}

export function deleteAdminCommunityReport(token, reportId) {
  return request(`/admin/community-reports/${reportId}`, { method: 'DELETE', token })
}

export function fetchAdminUsers(token) {
  return request('/admin/users', { token })
}

export function deleteAdminUser(token, userId) {
  return request(`/admin/users/${userId}`, { method: 'DELETE', token })
}

export function fetchAdminKnowledgeArticles(token) {
  return request('/admin/knowledge/articles', { token })
}

export function createAdminKnowledgeArticle(token, payload) {
  return request('/admin/knowledge/articles', { method: 'POST', token, body: payload })
}

export function updateAdminKnowledgeArticle(token, articleId, payload) {
  return request(`/admin/knowledge/articles/${articleId}`, { method: 'PUT', token, body: payload })
}

export function deleteAdminKnowledgeArticle(token, articleId) {
  return request(`/admin/knowledge/articles/${articleId}`, { method: 'DELETE', token })
}
