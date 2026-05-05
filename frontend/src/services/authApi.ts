import type {
  AuthResponse,
  LoginRequest,
  MeResponse,
  PasswordResetRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UpdateSensitiveProfileRequest,
} from 'hikeshield-shared'

const DEFAULT_BASE_URL =
  import.meta.env.VITE_HAZARD_API_BASE_URL || 'https://backend-production-f55c.up.railway.app/api'

function buildApiUrl(path: string): string {
  return `${DEFAULT_BASE_URL}${path}`
}

interface RequestOptions {
  method?: string
  token?: string
  body?: unknown
}

async function requestJson<T = unknown>(path: string, { method = 'GET', token, body }: RequestOptions = {}): Promise<T> {
  const url = buildApiUrl(path)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Network error: failed to reach backend API')
  }

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const backendMessage = String(payload?.error || '').trim()

    if (response.status === 401 && (path === '/auth/profile' || path === '/auth/profile/sensitive')) {
      throw new Error('Session expired. Please sign in again.')
    }

    throw new Error(backendMessage || `Request failed with ${response.status}`)
  }

  return payload as T
}

export function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/register', { method: 'POST', body: payload })
}

export function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/login', { method: 'POST', body: payload })
}

export function fetchCurrentUser(token: string): Promise<MeResponse> {
  return requestJson<MeResponse>('/auth/me', { token })
}

export function confirmPasswordReset(payload: PasswordResetRequest): Promise<unknown> {
  return requestJson('/auth/password-reset/security', { method: 'POST', body: payload })
}

export function updateCurrentUserProfile(token: string, payload: UpdateProfileRequest): Promise<MeResponse> {
  return requestJson<MeResponse>('/auth/profile', { method: 'PUT', token, body: payload })
}

export function updateCurrentUserSensitiveProfile(token: string, payload: UpdateSensitiveProfileRequest): Promise<MeResponse> {
  return requestJson<MeResponse>('/auth/profile/sensitive', { method: 'PUT', token, body: payload })
}
