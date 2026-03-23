<script setup>
import { ref } from 'vue'

const user = ref({
  name: 'Alex Chen',
  initials: 'AC',
  points: 120,
  streak: 7,
  rank: 42,
  quizzes: 45,
  events: 3,
  joinDate: 'Feb 2026'
})

const achievements = [
  { id: 1, name: 'First Steps', desc: 'Completed your first quiz', unlocked: true, icon: '🌱' },
  { id: 2, name: 'Streak Keeper', desc: '7-day learning streak', unlocked: true, icon: '🔥' },
  { id: 3, name: 'Eco Enthusiast', desc: 'Earned 500 eco-points', unlocked: false, icon: '🌿' },
  { id: 4, name: 'Activist', desc: 'Attended 5 events', unlocked: false, icon: '🏆' },
  { id: 5, name: 'Quiz Master', desc: '100 correct answers', unlocked: false, icon: '👑' },
  { id: 6, name: 'Top Ranker', desc: 'Reached weekly top 10', unlocked: false, icon: '⭐' },
]

const stats = [
  { label: 'Quizzes Taken', value: user.value.quizzes },
  { label: 'Accuracy', value: '78%' },
  { label: 'Events Joined', value: user.value.events },
  { label: 'Total Points', value: user.value.points },
]

const menuItems = [
  { label: 'Edit Profile', icon: 'user' },
  { label: 'Notification Settings', icon: 'bell' },
  { label: 'Appearance', icon: 'moon' },
  { label: 'Help & Feedback', icon: 'help' },
  { label: 'About EcoAware', icon: 'info' },
]
</script>

<template>
  <div class="profile-page">
    <!-- Profile Header -->
    <div class="profile-hero">
      <div class="profile-hero-bg"></div>
      <div class="profile-hero-content">
        <div class="avatar-ring">
          <div class="avatar">{{ user.initials }}</div>
        </div>
        <h1>{{ user.name }}</h1>
        <div class="member-info">
          <span class="member-since">Member since {{ user.joinDate }}</span>
          <span class="member-dot">&middot;</span>
          <span class="streak-label">{{ user.streak }}-day streak 🔥</span>
        </div>
      </div>
    </div>

    <div class="profile-body">
      <!-- Stats -->
      <section class="stats-section">
        <div class="stats-row">
          <div v-for="stat in stats" :key="stat.label" class="stat-item">
            <div class="stat-val">{{ stat.value }}</div>
            <div class="stat-key">{{ stat.label }}</div>
          </div>
        </div>
      </section>

      <!-- Two-column layout -->
      <div class="profile-columns">
        <div class="profile-col-left">
          <!-- Achievements -->
          <section class="achievements-section">
            <h2>Achievements</h2>
            <div class="achievements-grid">
              <div
                v-for="badge in achievements"
                :key="badge.id"
                class="badge-card"
                :class="{ locked: !badge.unlocked }"
              >
                <span class="badge-icon">{{ badge.icon }}</span>
                <div class="badge-name">{{ badge.name }}</div>
                <div class="badge-desc">{{ badge.desc }}</div>
                <div class="badge-status" v-if="badge.unlocked">Unlocked</div>
                <div class="badge-status locked-status" v-else>Locked</div>
              </div>
            </div>
          </section>
        </div>

        <div class="profile-col-right">
          <!-- Settings Menu -->
          <section class="settings-section">
            <h2>Settings</h2>
            <div class="settings-list">
              <button v-for="item in menuItems" :key="item.label" class="setting-row">
                <svg v-if="item.icon === 'user'" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="item.icon === 'bell'" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M7 14a2 2 0 004 0M9 2a5 5 0 00-5 5c0 2-1 4-2 5h14c-1-1-2-3-2-5a5 5 0 00-5-5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="item.icon === 'moon'" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M15.1 10.4A7 7 0 017.6 2.9 7 7 0 1015.1 10.4z" stroke="currentColor" stroke-width="1.2"/>
                </svg>
                <svg v-else-if="item.icon === 'help'" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M7 7a2 2 0 013.5 1.5c0 1.5-2 1.5-2 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  <circle cx="9" cy="13.5" r="0.5" fill="currentColor"/>
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M9 6v4M9 12h.01" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
                <span class="setting-label">{{ item.label }}</span>
                <svg class="setting-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* Hero */
.profile-hero {
  position: relative;
  padding: 80px 24px 48px;
  text-align: center;
  overflow: hidden;
}

.profile-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--color-primary-muted) 0%, var(--color-bg) 100%);
}

.profile-hero-content {
  position: relative;
}

.avatar-ring {
  display: inline-flex;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  margin-bottom: 16px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.profile-hero h1 {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.member-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.member-dot {
  opacity: 0.4;
}

.streak-label {
  color: var(--color-secondary);
  font-weight: 600;
}

/* Body */
.profile-body {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px 80px;
}

.profile-columns {
  display: flex;
  gap: 36px;
  align-items: flex-start;
}

.profile-col-left {
  flex: 1;
  min-width: 0;
}

.profile-col-right {
  width: 340px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
}

/* Stats */
.stats-section {
  margin-bottom: 40px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 20px 16px;
  text-align: center;
  transition: all 0.3s var(--ease-out-expo);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-val {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 2px;
}

.stat-key {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

/* Achievements */
.achievements-section {
  margin-bottom: 40px;
}

.achievements-section h2 {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 20px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.badge-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 20px 16px;
  text-align: center;
  transition: all 0.3s var(--ease-out-expo);
}

.badge-card:hover:not(.locked) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.badge-card.locked {
  opacity: 0.45;
}

.badge-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 10px;
}

.badge-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.badge-desc {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin-bottom: 10px;
}

.badge-status {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-success);
}

.locked-status {
  color: var(--color-text-muted);
}

/* Settings */
.settings-section h2 {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 20px;
}

.settings-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 24px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  font-size: 0.92rem;
  color: var(--color-text-secondary);
  text-align: left;
  transition: all 0.15s;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row:hover {
  background: var(--color-bg-warm);
  color: var(--color-text);
}

.setting-row svg:first-child {
  flex-shrink: 0;
}

.setting-label {
  flex: 1;
  color: var(--color-text);
}

.setting-arrow {
  flex-shrink: 0;
  color: var(--color-text-muted);
  opacity: 0.5;
}

@media (max-width: 900px) {
  .profile-columns {
    flex-direction: column;
  }

  .profile-col-right {
    width: 100%;
    position: static;
  }
}

@media (max-width: 768px) {
  .profile-body {
    padding: 0 16px 64px;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .achievements-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .profile-hero {
    padding: 48px 16px 36px;
  }

  .setting-row {
    padding: 16px 18px;
  }
}

@media (max-width: 480px) {
  .achievements-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
