<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthState } from '../services/authStore'

const route = useRoute()
const router = useRouter()
const isMenuOpen = ref(false)
const { isAuthenticated, state } = useAuthState()

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Risk Map', path: '/risk-map' },
  { name: 'Plan Route', path: '/route-planner' },
  { name: 'Community Reports', path: '/community-reports' },
  { name: 'Knowledge Hub', path: '/knowledge-hub' },
]

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const accountLabel = computed(() => {
  if (!isAuthenticated.value) return 'Sign In'
  const level = state.user?.experienceLevel || 'newcomer'
  if (level === 'advanced') return 'Profile · Advanced'
  if (level === 'intermediate') return 'Profile · Intermediate'
  return 'Profile · Newcomer'
})

function goAccount() {
  if (isAuthenticated.value) {
    router.push('/profile')
    return
  }

  router.push('/login')
}
</script>

<template>
  <header class="bg-white/80 backdrop-blur-xl sticky top-0 z-[3000] shadow-sm bg-surface-container-low">
    <nav class="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
      <router-link to="/" class="brand-lockup">
        <img src="/gohiking-logo.svg" alt="goHiking logo" class="brand-mark" />
        <span class="brand-wordmark">goHiking</span>
      </router-link>

      <div class="hidden md:flex items-center gap-8 font-headline font-bold tracking-tight text-on-surface">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="transition-all duration-300"
          :class="isActive(item.path)
            ? 'text-[#4A6741] border-b-2 border-[#4A6741] pb-1'
            : 'text-slate-600 hover:text-[#4A6741]'"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="flex items-center gap-4">
        <button
          class="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[#d8e4da] bg-white/80 hover:bg-white transition-all active:scale-95"
          @click="goAccount"
        >
          <span class="material-symbols-outlined text-[#4A6741]">account_circle</span>
          <span class="text-sm font-semibold text-[#31554a] hidden lg:inline">{{ accountLabel }}</span>
        </button>
        <button
          class="md:hidden p-2 rounded-full hover:bg-slate-100/50 transition-all"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span class="material-symbols-outlined text-on-surface">{{ isMenuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </nav>

    <transition name="dropdown">
      <div v-if="isMenuOpen" class="md:hidden px-8 pb-4 flex flex-col gap-2 bg-surface-container-low">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="py-3 px-4 rounded-lg font-headline font-bold tracking-tight transition-all"
          :class="isActive(item.path)
            ? 'text-[#4A6741] bg-primary/5'
            : 'text-slate-600 hover:text-[#4A6741] hover:bg-slate-50'"
          @click="isMenuOpen = false"
        >
          {{ item.name }}
        </router-link>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 0.62rem;
  text-decoration: none;
}

.brand-mark {
  width: 2.05rem;
  height: 2.05rem;
  border-radius: 0.7rem;
  box-shadow: 0 8px 18px rgba(32, 70, 56, 0.18);
}

.brand-wordmark {
  font-size: 1.45rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #2f5648;
  line-height: 1;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  max-height: 0;
}
.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  max-height: 400px;
}
</style>
