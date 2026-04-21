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
  <header class="site-nav">
    <nav class="site-nav__inner">
      <router-link to="/" class="brand-lockup">
        <img src="/hikeshield-logo.png" alt="HikeShield logo" class="brand-mark" />
        <span class="brand-text">
          <span class="brand-wordmark">HikeShield</span>
          <span class="brand-subline">Victoria trail safety</span>
        </span>
      </router-link>

      <div class="desktop-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="desktop-nav__link"
          :class="isActive(item.path)
            ? 'desktop-nav__link--active'
            : ''"
        >
          {{ item.name }}
        </router-link>
      </div>

      <div class="nav-actions">
        <!-- Temporarily hide Sign In entry from navbar for unauthenticated users -->
        <button
          v-if="isAuthenticated"
          class="account-btn"
          @click="goAccount"
        >
          <span class="material-symbols-outlined">account_circle</span>
          <span>{{ accountLabel }}</span>
        </button>
        <button
          class="menu-btn"
          @click="isMenuOpen = !isMenuOpen"
          aria-label="Toggle navigation"
        >
          <span class="material-symbols-outlined">{{ isMenuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </nav>

    <transition name="dropdown">
      <div v-if="isMenuOpen" class="mobile-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="mobile-nav__link"
          :class="isActive(item.path)
            ? 'mobile-nav__link--active'
            : ''"
          @click="isMenuOpen = false"
        >
          {{ item.name }}
        </router-link>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.site-nav {
  position: sticky;
  top: 0;
  z-index: 3000;
  border-bottom: 1px solid rgba(33, 72, 59, 0.12);
  background: rgba(255, 250, 242, 0.82);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: 0 12px 36px rgba(25, 56, 45, 0.08);
}

.site-nav__inner {
  width: min(1220px, calc(100% - 2rem));
  min-height: 72px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
  min-width: 0;
}

.brand-mark {
  width: 2.45rem;
  height: 2.45rem;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(32, 70, 56, 0.2));
}

.brand-text {
  display: grid;
  gap: 0.08rem;
}

.brand-wordmark {
  font-family: "Fraunces", "Georgia", serif;
  font-size: 1.46rem;
  font-weight: 700;
  font-variation-settings: "opsz" 48, "SOFT" 50;
  letter-spacing: -0.015em;
  color: #173b31;
  line-height: 1;
}

.brand-subline {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #6e8578;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  padding: 0.28rem;
}

.desktop-nav__link {
  border-radius: 999px;
  padding: 0.58rem 0.9rem;
  color: #4d6259;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.desktop-nav__link:hover,
.desktop-nav__link--active {
  background: #173b31;
  color: #fffaf2;
  box-shadow: 0 10px 22px rgba(23, 59, 49, 0.18);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.account-btn,
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  color: #21483b;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.account-btn {
  max-width: 18rem;
  padding: 0.55rem 0.72rem;
  font-size: 0.84rem;
  font-weight: 800;
}

.account-btn span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-btn {
  display: none;
  width: 2.65rem;
  height: 2.65rem;
}

.account-btn:hover,
.menu-btn:hover {
  background: #ffffff;
  border-color: rgba(33, 72, 59, 0.26);
  transform: translateY(-1px);
}

.mobile-nav {
  width: min(1220px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 0 0 1rem;
  display: none;
}

.mobile-nav__link {
  display: block;
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  color: #405a51;
  font-weight: 800;
  text-decoration: none;
}

.mobile-nav__link--active {
  background: #173b31;
  color: #fffaf2;
}

@media (max-width: 640px) {
  .site-nav__inner {
    min-height: 66px;
    width: min(100% - 1.5rem, 1220px);
  }

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

  .brand-subline {
    display: none;
  }
}

@media (max-width: 980px) {
  .desktop-nav {
    display: none;
  }

  .menu-btn {
    display: inline-flex;
  }

  .mobile-nav {
    display: grid;
    gap: 0.35rem;
  }

  .account-btn {
    max-width: 46vw;
  }

  .account-btn span:last-child {
    display: none;
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
