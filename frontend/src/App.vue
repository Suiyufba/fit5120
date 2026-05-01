<script setup>
import { computed, ref } from 'vue'
import Navbar from './components/Navbar.vue'

const ACCESS_PASSWORD = import.meta.env.VITE_SITE_ACCESS_PASSWORD || 'gkd'
const ACCESS_STORAGE_KEY = 'hikeshield_site_access_granted'

const passwordInput = ref('')
const accessError = ref('')
const hasAccess = ref(readStoredAccess())
const canSubmit = computed(() => passwordInput.value.trim().length > 0)

function readStoredAccess() {
  try {
    return localStorage.getItem(ACCESS_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function storeAccess() {
  try {
    localStorage.setItem(ACCESS_STORAGE_KEY, 'true')
  } catch {
    // Private browsing or locked-down browser storage should not block entry.
  }
}

function unlockSite() {
  if (passwordInput.value === ACCESS_PASSWORD) {
    storeAccess()
    hasAccess.value = true
    accessError.value = ''
    passwordInput.value = ''
    return
  }

  accessError.value = 'Password incorrect'
}
</script>

<template>
  <section v-if="!hasAccess" class="site-lock" aria-labelledby="site-lock-title">
    <div class="site-lock__backdrop" aria-hidden="true"></div>
    <form class="site-lock__panel" @submit.prevent="unlockSite">
      <div class="site-lock__mark" aria-hidden="true">
        <span class="material-symbols-outlined">lock</span>
      </div>
      <p class="u-kicker">Private preview</p>
      <h1 id="site-lock-title">HikeShield</h1>
      <p class="site-lock__copy">Enter the access password to continue.</p>
      <label class="site-lock__field">
        <span>Password</span>
        <input
          v-model="passwordInput"
          type="password"
          autocomplete="current-password"
          autofocus
          aria-describedby="site-lock-error"
          placeholder="Access password"
        />
      </label>
      <p v-if="accessError" id="site-lock-error" class="site-lock__error" role="alert">
        {{ accessError }}
      </p>
      <button class="site-lock__button" type="submit" :disabled="!canSubmit">
        <span class="material-symbols-outlined" aria-hidden="true">login</span>
        Enter
      </button>
    </form>
  </section>

  <div id="app" class="font-body text-on-surface min-h-screen flex flex-col">
    <template v-if="hasAccess">
      <Navbar />
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </template>
  </div>
</template>

<style>
.site-lock {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 1.25rem;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 250, 242, 0.88), rgba(231, 238, 228, 0.9)),
    var(--hs-hero-image) center / cover;
}

.site-lock__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, rgba(19, 43, 35, 0.78), rgba(33, 72, 59, 0.42) 48%, rgba(247, 242, 233, 0.72)),
    radial-gradient(circle at 18% 12%, rgba(143, 174, 131, 0.42), transparent 20rem);
}

.site-lock__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 390px);
  border: 1px solid rgba(255, 250, 242, 0.72);
  border-radius: 8px;
  background: rgba(255, 250, 242, 0.94);
  box-shadow: 0 30px 90px rgba(19, 43, 35, 0.34);
  padding: clamp(1.35rem, 4vw, 2rem);
  color: var(--hs-ink);
  backdrop-filter: blur(18px);
}

.site-lock__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 1.1rem;
  border-radius: 999px;
  background: var(--hs-forest);
  color: var(--hs-paper);
}

.site-lock__mark .material-symbols-outlined {
  font-size: 1.35rem;
}

.site-lock h1 {
  margin-top: 0.55rem;
  font-size: 2.4rem;
  letter-spacing: 0;
}

.site-lock__copy {
  margin-top: 0.55rem;
  color: var(--hs-ink-soft);
  font-size: 0.96rem;
}

.site-lock__field {
  display: grid;
  gap: 0.45rem;
  margin-top: 1.45rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--hs-forest);
}

.site-lock__field input {
  width: 100%;
  min-height: 3rem;
  border: 1px solid rgba(33, 72, 59, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.75rem 0.9rem;
  color: var(--hs-ink);
  font: inherit;
  font-weight: 600;
}

.site-lock__field input::placeholder {
  color: rgba(64, 90, 81, 0.6);
}

.site-lock__error {
  margin-top: 0.65rem;
  color: #9f2f28;
  font-size: 0.84rem;
  font-weight: 700;
}

.site-lock__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.48rem;
  width: 100%;
  min-height: 3rem;
  margin-top: 1rem;
  border: 0;
  border-radius: 8px;
  background: var(--hs-forest);
  color: var(--hs-paper);
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, opacity 0.18s ease;
}

.site-lock__button:hover:not(:disabled) {
  background: var(--hs-forest-2);
  transform: translateY(-1px);
}

.site-lock__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
