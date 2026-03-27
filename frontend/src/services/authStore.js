import { computed, reactive } from 'vue'
import {
  confirmPasswordReset,
  fetchCurrentUser,
  loginUser,
  registerUser,
} from './authApi'

const TOKEN_KEY = 'gohiking_auth_token'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: null,
  ready: false,
})

const isAuthenticated = computed(() => Boolean(state.token && state.user))

function persistToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    return
  }
  localStorage.removeItem(TOKEN_KEY)
}

function setSession({ token, user }) {
  state.token = token || ''
  state.user = user || null
  persistToken(state.token)
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

export function useAuthState() {
  return {
    state,
    isAuthenticated,
  }
}
