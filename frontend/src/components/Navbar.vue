<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthState } from '../services/authStore'

const route = useRoute()
const router = useRouter()
const isMenuOpen = ref(false)
const { isAuthenticated, state } = useAuthState()

const navItems = computed(() => [
  { name: 'Home', path: '/' },
  { name: 'Risk Map', path: '/risk-map' },
  { name: 'Plan Route', path: '/route-planner' },
  { name: 'Community Reports', path: '/community-reports' },
  { name: 'Knowledge Hub', path: '/knowledge-hub' },
])

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
  }
}

</script>

<template>
  <header class="bg-white/80 backdrop-blur-xl sticky top-0 z-[3000] shadow-sm bg-surface-container-low">
    <nav class="flex justify-between items-center px-4 py-3 md:px-8 md:py-4 max-w-full mx-auto">
      <router-link to="/" class="brand-lockup">
        <img src="/hikeshield-logo.png" alt="HikeShield logo" class="brand-mark" />
        <span class="brand-wordmark">HikeShield</span>
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

      <div class="flex items-center gap-2 md:gap-4">
        <!-- Temporarily hide Sign In entry from navbar for unauthenticated users -->
        <button
          v-if="isAuthenticated"
          class="inline-flex items-center gap-2 px-2.5 py-2 md:px-3 rounded-full border border-[#d8e4da] bg-white/80 hover:bg-white transition-all active:scale-95 max-w-[58vw] md:max-w-none"
          @click="goAccount"
        >
          <span class="material-symbols-outlined text-[#4A6741]">account_circle</span>
          <span class="text-sm font-semibold text-[#31554a] hidden sm:inline lg:inline truncate">{{ accountLabel }}</span>
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
      <div v-if="isMenuOpen" class="md:hidden px-4 pb-4 flex flex-col gap-2 bg-surface-container-low">
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
  min-width: 0;
}

.brand-mark {
  width: 2.25rem;
  height: 2.25rem;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(32, 70, 56, 0.22));
}

.brand-wordmark {
  font-family: "Fraunces", "Georgia", serif;
  font-size: 1.55rem;
  font-weight: 700;
  font-variation-settings: "opsz" 48, "SOFT" 50;
  letter-spacing: -0.015em;
  color: #2f5648;
  line-height: 1;
}

@media (max-width: 640px) {
  .brand-lockup {
    gap: 0.48rem;
  }

  .brand-mark {
    width: 1.95rem;
    height: 1.95rem;
  }

  .brand-wordmark {
    font-size: 1.18rem;
  }
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
