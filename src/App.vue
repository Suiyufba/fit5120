<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div id="app">
    <Navbar />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <h3>EcoAware Australia</h3>
            <p>Empowering Australians to understand, protect, and restore our unique natural environment through knowledge and community action.</p>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <h4>Explore</h4>
              <router-link to="/">Home</router-link>
              <router-link to="/quiz">Eco Quiz</router-link>
              <router-link to="/events">Activities</router-link>
            </div>
            <div class="footer-col">
              <h4>Account</h4>
              <router-link to="/rewards">Rewards</router-link>
              <router-link to="/profile">Profile</router-link>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 EcoAware Australia. Built for a greener tomorrow.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.main-content {
  min-height: 100vh;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s var(--ease-out-expo), transform 0.3s var(--ease-out-expo);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.site-footer {
  background: var(--color-text);
  color: var(--color-bg);
  padding: 64px 24px 32px;
  margin-top: 80px;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-top {
  display: flex;
  justify-content: space-between;
  gap: 48px;
  margin-bottom: 48px;
}

.footer-brand {
  max-width: 380px;
}

.footer-brand h3 {
  font-family: var(--font-display);
  font-size: 1.3rem;
  margin-bottom: 12px;
  color: var(--color-sand);
}

.footer-brand p {
  font-size: 0.9rem;
  line-height: 1.7;
  opacity: 0.65;
}

.footer-links {
  display: flex;
  gap: 56px;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col h4 {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-sand);
  margin-bottom: 4px;
}

.footer-col a {
  font-size: 0.9rem;
  opacity: 0.55;
  transition: opacity 0.2s;
}

.footer-col a:hover {
  opacity: 1;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 24px;
}

.footer-bottom p {
  font-size: 0.8rem;
  opacity: 0.4;
}

@media (max-width: 768px) {
  .footer-top {
    flex-direction: column;
    gap: 32px;
  }

  .footer-links {
    gap: 40px;
  }

  .site-footer {
    padding: 48px 16px 24px;
    margin-top: 48px;
  }
}
</style>
