import { computed, reactive } from 'vue'
import type { AuthResponse, MeResponse, User } from 'hikeshield-shared'
import {
  confirmPasswordReset,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUserProfile,
  updateCurrentUserSensitiveProfile,
} from './authApi'

/**
 * Auth is held in an HttpOnly cookie set by the backend. The token field is
 * kept only for older route-planner call sites; it is intentionally never
 * populated or persisted in browser storage.
 */
interface AuthState {
  token: string
  user: User | null
  ready: boolean
}

const state = reactive<AuthState>({
  token: '',
  user: null,
  ready: false,
})

const isAuthenticated = computed(() => Boolean(state.user))

function setSession({ user }: { user: User | null }): void {
  state.token = ''
  state.user = user || null
}

export function logout(): void {
  setSession({ user: null })
  void logoutUser().catch(() => {
    // Local logout should not be blocked by a transient network failure.
  })
}

export async function restoreSession(): Promise<void> {
  if (state.ready) return

  try {
    const payload = await fetchCurrentUser() as MeResponse
    setSession({ user: payload.user })
  } catch {
    setSession({ user: null })
  } finally {
    state.ready = true
  }
}

export async function signIn({ email, password }: { email: string; password: string }): Promise<User> {
  const payload = await loginUser({ email, password }) as AuthResponse
  setSession({ user: payload?.user || null })
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
  setSession({ user: payload?.user || null })
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
  if (!state.user) {
    throw new Error('Profile editing is unavailable for this session')
  }

  const payload = await updateCurrentUserProfile('', params) as MeResponse
  setSession({ user: payload.user })
  return payload.user
}

export async function saveSensitiveProfile(params: {
  email?: string
  newPassword?: string
  securityQuestion?: string
  securityAnswer?: string
}): Promise<User> {
  if (!state.user) {
    throw new Error('Credential editing is unavailable for this session')
  }

  const payload = await updateCurrentUserSensitiveProfile('', params) as MeResponse
  setSession({ user: payload.user })
  return payload.user
}

export function useAuthState() {
  return {
    state,
    isAuthenticated,
  }
}
