<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const points = ref(120)
const isMenuOpen = ref(false)

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Quiz', path: '/quiz' },
  { name: 'Events', path: '/events' },
  { name: 'Rewards', path: '/rewards' },
  { name: 'Profile', path: '/profile' },
]

const isActive = (path) => route.path === path

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <header class="navbar">
    <div class="navbar-inner">
      <router-link to="/" class="brand">
        <svg class="brand-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="13" stroke="currentColor" stroke-width="1.5"/>
          <path d="M14 5c-1 3-4 5-6 8s-1 7 2 9c2 1.5 4 1 5-1 1 2 3 2.5 5 1 3-2 4-6 2-9s-5-5-6-8h-2z" fill="currentColor" opacity="0.15"/>
          <path d="M14 7c-0.8 2.5-3 4.5-5 7s-1 5.5 1.5 7c1.5 1 3 0.5 3.5-1 0.5 1.5 2 2 3.5 1 2.5-1.5 3-5 1.5-7s-3.5-4.5-4.2-7h-0.8z" fill="currentColor" opacity="0.7"/>
        </svg>
        <span class="brand-name">EcoAware</span>
        <span class="brand-tag">Australia</span>
      </router-link>

      <nav class="nav-links">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: isActive(item.path) }"
        >
          {{ item.name }}
        </router-link>
      </nav>

      <div class="nav-right">
        <div class="points-pill">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="var(--color-primary)" opacity="0.2"/>
            <circle cx="8" cy="8" r="3" fill="var(--color-primary)"/>
          </svg>
          <span>{{ points }} pts</span>
        </div>
        <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu">
          <span class="menu-bar" :class="{ open: isMenuOpen }"></span>
        </button>
      </div>
    </div>

    <transition name="dropdown">
      <div v-if="isMenuOpen" class="mobile-menu">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="mobile-link"
          :class="{ active: isActive(item.path) }"
          @click="isMenuOpen = false"
        >
          {{ item.name }}
        </router-link>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250, 246, 240, 0.88);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-bottom: 1px solid var(--color-border-light);
}

@media (prefers-color-scheme: dark) {
  .navbar {
    background: rgba(26, 20, 16, 0.88);
  }
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 40px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--color-primary);
}

.brand-icon {
  color: var(--color-primary);
}

.brand-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.3rem;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.brand-tag {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-secondary);
  background: var(--color-secondary-muted);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-full);
  transition: all 0.25s var(--ease-out-expo);
  position: relative;
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-primary-muted);
}

.nav-link.active {
  color: var(--color-primary);
  background: var(--color-primary-muted);
  font-weight: 600;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-primary-muted);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
}

.menu-toggle {
  display: none;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  position: relative;
  align-items: center;
  justify-content: center;
}

.menu-bar,
.menu-bar::before,
.menu-bar::after {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-text);
  border-radius: 1px;
  transition: all 0.3s var(--ease-out-expo);
}

.menu-bar::before,
.menu-bar::after {
  content: '';
  position: absolute;
}

.menu-bar::before { transform: translateY(-6px); }
.menu-bar::after { transform: translateY(6px); }

.menu-bar.open { background: transparent; }
.menu-bar.open::before { transform: rotate(45deg); }
.menu-bar.open::after { transform: rotate(-45deg); }

.mobile-menu {
  display: none;
  flex-direction: column;
  padding: 8px 24px 20px;
  border-top: 1px solid var(--color-border-light);
}

.mobile-link {
  padding: 14px 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-bottom: 1px solid var(--color-border-light);
  transition: color 0.2s;
}

.mobile-link:last-child {
  border-bottom: none;
}

.mobile-link.active {
  color: var(--color-primary);
  font-weight: 600;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s var(--ease-out-expo);
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

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .menu-toggle {
    display: flex;
  }

  .mobile-menu {
    display: flex;
  }

  .navbar-inner {
    padding: 12px 16px;
  }
}
</style>
