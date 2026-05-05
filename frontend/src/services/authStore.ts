import { computed, reactive } from 'vue'
import type { AuthResponse, MeResponse, User } from 'hikeshield-shared'
import {
  confirmPasswordReset,
  fetchCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUserProfile,
  updateCurrentUserSensitiveProfile,
} from './authApi'

const SESSION_TOKEN_KEY = 'hikeshield_auth_token'

interface AuthState {
  token: string
  user: User | null
  ready: boolean
}

const state = reactive<AuthState>({
  token: sessionStorage.getItem(SESSION_TOKEN_KEY) || '',
  user: null,
  ready: false,
})

const isAuthenticated = computed(() => Boolean(state.token && state.user))

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = String(token).split('.')[1]
    if (!payloadBase64) return true
    const payload = JSON.parse(atob(payloadBase64)) as { exp?: number }
    const exp = Number(payload?.exp || 0)
    if (!exp) return true
    return exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function setSession({ token, user }: { token: string; user: User | null }): void {
  state.token = token || ''
  state.user = user || null
  if (state.token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, state.token)
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
  }
}

function extractToken(payload: AuthResponse): string {
  return String(payload?.token || '')
}

export function logout(): void {
  setSession({ token: '', user: null })
}

export async function restoreSession(): Promise<void> {
  if (state.ready) return

  if (!state.token || isTokenExpired(state.token)) {
    logout()
    state.ready = true
    return
  }

  try {
    const payload = await fetchCurrentUser(state.token) as MeResponse
    setSession({ token: state.token, user: payload.user })
  } catch {
    logout()
  } finally {
    state.ready = true
  }
}

export async function signIn({ email, password }: { email: string; password: string }): Promise<User> {
  const payload = await loginUser({ email, password }) as AuthResponse
  setSession({ token: extractToken(payload), user: payload?.user || null })
  return payload.user
}

export async function signUp(params: {
  email: string
  password: string
  age: number
  region: string
  securityQuestion: string
  securityAnswer: string
  assessmentAnswers: Record<string, string>
}): Promise<User> {
  const payload = await registerUser(params) as AuthResponse
  setSession({ token: extractToken(payload), user: payload?.user || null })
  return payload.user
}

export async function resetPassword(params: {
  email: string
  securityQuestion: string
  securityAnswer: string
  newPassword: string
}): Promise<unknown> {
  return confirmPasswordReset(params)
}

export async function saveProfile(params: { age?: number; region?: string }): Promise<User> {
  if (!state.token || !state.user) {
    throw new Error('Profile editing is unavailable for this session')
  }

  const payload = await updateCurrentUserProfile(state.token, params) as MeResponse
  setSession({ token: state.token, user: payload.user })
  return payload.user
}

export async function saveSensitiveProfile(params: {
  email?: string
  newPassword?: string
  securityQuestion?: string
  securityAnswer?: string
}): Promise<User> {
  if (!state.token || !state.user) {
    throw new Error('Credential editing is unavailable for this session')
  }

  const payload = await updateCurrentUserSensitiveProfile(state.token, params) as MeResponse
  setSession({ token: state.token, user: payload.user })
  return payload.user
}

export function useAuthState() {
  return {
    state,
    isAuthenticated,
  }
}
