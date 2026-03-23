<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const points = ref(120)

const navItems = [
  { name: '首页', path: '/', icon: '🏠' },
  { name: '问答', path: '/quiz', icon: '📝' },
  { name: '活动', path: '/events', icon: '📅' },
  { name: '积分', path: '/rewards', icon: '🎁' },
  { name: '我的', path: '/profile', icon: '👤' },
]
</script>

<template>
  <!-- Top Bar -->
  <header class="top-bar">
    <div class="top-bar-content">
      <div class="logo">
        <span class="logo-icon">🌿</span>
        <span class="logo-text">EcoQuiz</span>
      </div>
      <div class="top-bar-right">
        <div class="points-badge">
          <span class="points-value">{{ points }}</span>
          <span class="points-icon">🌱</span>
        </div>
        <button class="notification-btn">
          🔔
          <span class="notification-dot"></span>
        </button>
      </div>
    </div>
  </header>

  <!-- Bottom Navigation (Mobile) -->
  <nav class="bottom-nav">
    <div class="bottom-nav-content">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.name }}</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
/* Top Bar */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-surface, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.top-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 480px;
  margin: 0 auto;
  padding: 12px 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-weight: 700;
  font-size: 1.125rem;
  color: #4caf50;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(76, 175, 80, 0.1);
  padding: 4px 12px;
  border-radius: 100px;
}

.points-value {
  font-weight: 600;
  color: #4caf50;
}

.points-icon {
  font-size: 0.875rem;
}

.notification-btn {
  position: relative;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px;
}

.notification-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: #f44336;
  border-radius: 50%;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-surface, #ffffff);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.bottom-nav-content {
  display: flex;
  justify-content: space-around;
  max-width: 480px;
  margin: 0 auto;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  text-decoration: none;
  color: var(--color-text-secondary, #64748b);
  transition: color 0.2s;
}

.nav-item.active {
  color: #4caf50;
}

.nav-icon {
  font-size: 1.25rem;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 0.75rem;
  font-weight: 500;
}
</style>