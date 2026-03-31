import { computed, reactive } from 'vue'
import {
  confirmPasswordReset,
  fetchCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUserProfile,
  updateCurrentUserSensitiveProfile,
} from './authApi'

const SESSION_TOKEN_KEY = 'hikeshield_auth_token'

const state = reactive({
  token: sessionStorage.getItem(SESSION_TOKEN_KEY) || '',
  user: null,
  ready: false,
})

const isAuthenticated = computed(() => Boolean(state.token && state.user))

function isTokenExpired(token) {
  try {
    const payloadBase64 = String(token).split('.')[1]
    if (!payloadBase64) return true
    const payload = JSON.parse(atob(payloadBase64))
    const exp = Number(payload?.exp || 0)
    if (!exp) return true
    return exp * 1000 <= Date.now()
  } catch (_error) {
    return true
  }
}

function setSession({ token, user }) {
  state.token = token || ''
  state.user = user || null
  if (state.token) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, state.token)
  } else {
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
  }
}

function extractToken(payload) {
  return String(payload?.token || payload?.accessToken || payload?.jwt || '')
}

export function logout() {
  setSession({ token: '', user: null })
}

export async function restoreSession() {
  if (state.ready) return

  if (!state.token || isTokenExpired(state.token)) {
    logout()
    state.ready = true
    return
  }

  try {
    const payload = await fetchCurrentUser(state.token)
    setSession({ token: state.token, user: payload.user })
  } catch (_error) {
    logout()
  } finally {
    state.ready = true
  }
}

export async function signIn({ email, password }) {
  const payload = await loginUser({ email, password })
  setSession({ token: extractToken(payload), user: payload?.user || null })
  return payload.user
}

export async function signUp({ email, password, age, region, securityQuestion, securityAnswer, assessmentAnswers }) {
  const payload = await registerUser({
    email,
    password,
    age,
    region,
    securityQuestion,
    securityAnswer,
    assessmentAnswers,
  })
  setSession({ token: extractToken(payload), user: payload?.user || null })
  return payload.user
}

export async function resetPassword({ email, securityQuestion, securityAnswer, newPassword }) {
  return confirmPasswordReset({ email, securityQuestion, securityAnswer, newPassword })
}

export async function saveProfile({ age, region }) {
  if (!state.token || !state.user) {
    throw new Error('Profile editing is unavailable for this session')
  }

  const payload = await updateCurrentUserProfile(state.token, { age, region })
  setSession({ token: state.token, user: payload.user })
  return payload.user
}

export async function saveSensitiveProfile({ email, newPassword, securityQuestion, securityAnswer }) {
  if (!state.token || !state.user) {
    throw new Error('Credential editing is unavailable for this session')
  }

  const payload = await updateCurrentUserSensitiveProfile(state.token, {
    email,
    newPassword,
    securityQuestion,
    securityAnswer,
  })
  setSession({ token: state.token, user: payload.user })
  return payload.user
}

export function useAuthState() {
  return {
    state,
    isAuthenticated,
  }
}
