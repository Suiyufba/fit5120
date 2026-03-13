<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileMenuOpen = ref(false)

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'UV Tracker', path: '/track-uv' },
  { name: 'Sun Safety Hub', path: '/raising-awareness' },
  { name: 'Prevention', path: '/prevention' },
  { name: 'Community', path: '/community' },
]

function toggleMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-accent"></div>

    <button class="menu-toggle" @click="toggleMenu" :class="{ active: mobileMenuOpen }">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <ul class="nav-links" :class="{ open: mobileMenuOpen }">
      <li v-for="link in navLinks" :key="link.path">
        <router-link
          :to="link.path"
          :class="{ active: route.path === link.path }"
          @click="closeMenu"
        >
          {{ link.name }}
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.navbar-accent {
  height: 3px;
  background: linear-gradient(90deg, #2EC4B6, #20B2AA, #3CB371);
}

.nav-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-links li {
  flex: 1;
  text-align: center;
}

.nav-links a {
  display: block;
  padding: 14px 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #64748B;
  transition: all 0.2s;
  white-space: nowrap;
  border-bottom: 3px solid transparent;
}

.nav-links a:hover {
  color: var(--color-primary);
  background: rgba(255, 107, 53, 0.04);
  border-bottom-color: rgba(255, 107, 53, 0.3);
}

.nav-links a.active {
  color: var(--color-primary);
  font-weight: 600;
  border-bottom-color: var(--color-primary);
}

/* Hamburger - mobile only */
.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 14px 20px;
}

.menu-toggle span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--color-text);
  border-radius: 2px;
  transition: all 0.3s;
}

.menu-toggle.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}
.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}
.menu-toggle.active span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

@media (max-width: 768px) {
  .menu-toggle {
    display: flex;
  }

  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    flex-direction: column;
    padding: 8px 0;
    gap: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-120%);
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: -1;
  }

  .nav-links.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  .nav-links li {
    flex: none;
    width: 100%;
  }

  .nav-links a {
    padding: 14px 24px;
    text-align: left;
    font-size: 1rem;
    border-bottom: none;
    border-left: 3px solid transparent;
  }

  .nav-links a.active {
    border-bottom: none;
    border-left-color: var(--color-primary);
  }

  .nav-links a:hover {
    border-bottom: none;
    border-left-color: rgba(255, 107, 53, 0.3);
  }
}
</style>
