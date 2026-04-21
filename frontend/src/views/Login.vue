<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signIn } from '../services/authStore'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''
  try {
    await signIn({
      email: email.value,
      password: password.value,
    })

    const redirectPath = route.query.redirect
      ? decodeURIComponent(String(route.query.redirect))
      : '/profile'
    router.push(redirectPath)
  } catch (error) {
    errorMessage.value = error?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <p class="auth-kicker">HikeShield Account</p>
      <h1>Welcome Back</h1>
      <p class="auth-subtitle">Sign in to view your level, risk profile, and route recommendations.</p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" required autocomplete="username" />
        </label>

        <label>
          <span>Password</span>
          <input v-model="password" type="password" required minlength="12" autocomplete="current-password" />
        </label>

        <p class="auth-forgot">
          <router-link to="/forgot-password">Forgot password?</router-link>
        </p>

        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="auth-footer">
        Don't have an account yet?
        <router-link to="/register">Create one</router-link>
      </p>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
  background:
    linear-gradient(110deg, rgba(23, 59, 49, 0.86), rgba(23, 59, 49, 0.28)),
    var(--hs-hero-image) center/cover;
}

.auth-card {
  width: min(470px, 100%);
  background: rgba(255, 250, 242, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 1.25rem;
  padding: 1.6rem;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(18px);
}

.auth-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 900;
  color: #6f897b;
}

h1 {
  margin-top: 0.25rem;
  color: #17352f;
  font-size: 2rem;
}

.auth-subtitle {
  margin-top: 0.5rem;
  color: #4d635d;
}

.auth-form {
  margin-top: 1.2rem;
  display: grid;
  gap: 0.9rem;
}

label {
  display: grid;
  gap: 0.3rem;
}

span {
  color: #294740;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

input {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.85rem;
  padding: 0.78rem 0.9rem;
  background: #ffffff;
  color: #17352f;
}

button {
  margin-top: 0.3rem;
  border: none;
  border-radius: 999px;
  padding: 0.86rem 1rem;
  color: #fffaf2;
  font-weight: 800;
  background: linear-gradient(135deg, #173b31, #2f604e 68%, #7f9b75);
}

button:disabled {
  opacity: 0.6;
}

.auth-error {
  color: #b63030;
  font-size: 0.85rem;
}

.auth-footer {
  margin-top: 1rem;
  color: #4d635d;
}

.auth-footer a {
  color: #2e6b55;
  font-weight: 700;
}

.auth-forgot a {
  color: #4b5f58;
  font-size: 0.84rem;
}

@media (max-width: 640px) {
  .auth-page {
    padding: 1rem 0.85rem 1.4rem;
  }

  .auth-card {
    border-radius: 1.15rem;
    padding: 1.1rem;
  }

  h1 {
    font-size: 1.7rem;
  }
}
</style>
