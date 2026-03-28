import { computed, reactive } from 'vue'
import {
  confirmPasswordReset,
  fetchCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUserProfile,
  updateCurrentUserSensitiveProfile,
} from './authApi'

const TOKEN_KEY = 'hikeshield_auth_token'
const LEGACY_TOKEN_KEY = 'gohiking_auth_token'
const ADMIN_TOKEN = 'local-admin-token'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = '123456'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || '',
  user: null,
  ready: false,
})

const isAuthenticated = computed(() => Boolean(state.token && state.user))

function persistToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    return
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

function setSession({ token, user }) {
  state.token = token || ''
  state.user = user || null
  persistToken(state.token)
}

function buildLocalAdminUser() {
  return {
    id: 'local-admin',
    email: 'admin',
    age: 0,
    region: 'Admin Console',
    securityQuestion: '',
    experienceLevel: 'advanced',
    assessmentScore: 100,
    createdAt: new Date().toISOString(),
    isAdmin: true,
  }
}

export function logout() {
  setSession({ token: '', user: null })
}

export async function restoreSession() {
  if (state.ready) return

  if (!state.token) {
    state.ready = true
    return
  }

  if (state.token === ADMIN_TOKEN) {
    setSession({ token: ADMIN_TOKEN, user: buildLocalAdminUser() })
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
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (normalizedEmail === ADMIN_USERNAME && String(password || '') === ADMIN_PASSWORD) {
    const user = buildLocalAdminUser()
    setSession({ token: ADMIN_TOKEN, user })
    return user
  }

  const payload = await loginUser({ email, password })
  setSession(payload)
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
    assessmentAnswers
  })
  setSession(payload)
  return payload.user
}

export async function resetPassword({ email, securityQuestion, securityAnswer, newPassword }) {
  return confirmPasswordReset({ email, securityQuestion, securityAnswer, newPassword })
}

export async function saveProfile({ age, region }) {
  if (!state.token || !state.user || state.token === ADMIN_TOKEN) {
    throw new Error('Profile editing is unavailable for this session')
  }

  const payload = await updateCurrentUserProfile(state.token, { age, region })
  setSession({ token: state.token, user: payload.user })
  return payload.user
}

export async function saveSensitiveProfile({ email, newPassword, securityQuestion, securityAnswer }) {
  if (!state.token || !state.user || state.token === ADMIN_TOKEN) {
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
