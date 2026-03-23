<script setup>
import { ref } from 'vue'

const user = ref({
  name: 'Alex',
  avatar: '🧑‍💻',
  points: 120,
  streak: 7,
  rank: 42,
  quizzes: 45,
  events: 3
})

const achievements = [
  { id: 1, name: '初学者', icon: '🌱', desc: '完成第一次问答', unlocked: true },
  { id: 2, name: '坚持者', icon: '🔥', desc: '连续学习7天', unlocked: true },
  { id: 3, name: '环保达人', icon: '🌿', desc: '累计获得500积分', unlocked: false },
  { id: 4, name: '活动家', icon: '🏆', desc: '参加5次活动', unlocked: false },
  { id: 5, name: '知识王', icon: '👑', desc: '答对100道题', unlocked: false },
  { id: 6, name: '排行榜达人', icon: '⭐', desc: '进入周榜前10', unlocked: false },
]

const stats = [
  { label: '答题总数', value: user.value.quizzes, icon: '📝' },
  { label: '正确率', value: '78%', icon: '✅' },
  { label: '参与活动', value: user.value.events, icon: '📅' },
  { label: '总积分', value: user.value.points, icon: '🌱' },
]
</script>

<template>
  <div class="profile-page">
    <!-- Profile Header -->
    <header class="profile-header">
      <div class="avatar">{{ user.avatar }}</div>
      <h1>{{ user.name }}</h1>
      <div class="streak-badge">
        <span class="streak-icon">🔥</span>
        连续学习 {{ user.streak }} 天
      </div>
    </header>

    <!-- Stats Grid -->
    <section class="stats-section">
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
          <span class="stat-icon">{{ stat.icon }}</span>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- Achievements -->
    <section class="achievements-section">
      <h2>🏆 成就徽章</h2>
      <div class="achievements-grid">
        <div 
          v-for="achievement in achievements" 
          :key="achievement.id" 
          class="achievement-card"
          :class="{ locked: !achievement.unlocked }"
        >
          <div class="achievement-icon">{{ achievement.icon }}</div>
          <div class="achievement-name">{{ achievement.name }}</div>
          <div class="achievement-desc">{{ achievement.desc }}</div>
        </div>
      </div>
    </section>

    <!-- Settings -->
    <section class="settings-section">
      <h2>⚙️ 设置</h2>
      <div class="settings-list">
        <div class="setting-item">
          <span class="setting-icon">👤</span>
          <span class="setting-name">编辑资料</span>
          <span class="setting-arrow">→</span>
        </div>
        <div class="setting-item">
          <span class="setting-icon">🔔</span>
          <span class="setting-name">通知设置</span>
          <span class="setting-arrow">→</span>
        </div>
        <div class="setting-item">
          <span class="setting-icon">🌙</span>
          <span class="setting-name">深色模式</span>
          <span class="setting-arrow">→</span>
        </div>
        <div class="setting-item">
          <span class="setting-icon">❓</span>
          <span class="setting-name">帮助与反馈</span>
          <span class="setting-arrow">→</span>
        </div>
        <div class="setting-item">
          <span class="setting-icon">📜</span>
          <span class="setting-name">关于我们</span>
          <span class="setting-arrow">→</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--color-bg, #f8fafc);
  padding-bottom: 80px;
}

.profile-header {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  padding: 48px 16px 32px;
  text-align: center;
  color: white;
}

.avatar {
  font-size: 4rem;
  margin-bottom: 12px;
}

.profile-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
}

.streak-icon {
  font-size: 1rem;
}

.stats-section {
  padding: 16px;
  margin-top: -16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-icon {
  font-size: 1.5rem;
  margin-bottom: 8px;
  display: block;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-secondary, #1b4965);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
  margin-top: 4px;
}

.achievements-section {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.achievements-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 16px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.achievement-card {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.achievement-card.locked {
  opacity: 0.4;
}

.achievement-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.achievement-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 0.6875rem;
  color: var(--color-text-secondary, #64748b);
  line-height: 1.3;
}

.settings-section {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.settings-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 16px;
}

.settings-list {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-icon {
  font-size: 1.25rem;
  margin-right: 12px;
}

.setting-name {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--color-text, #1e293b);
}

.setting-arrow {
  color: var(--color-text-secondary, #64748b);
}
</style>