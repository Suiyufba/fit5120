<script setup>
import { ref } from 'vue'

const userPoints = ref(120)

const rewards = [
  { id: 1, name: '咖啡杯', icon: '☕', points: 100, category: 'lifestyle' },
  { id: 2, name: '小植物', icon: '🌱', points: 150, category: 'nature' },
  { id: 3, name: '电影票', icon: '🎫', points: 200, category: 'entertainment' },
  { id: 4, name: '环保袋', icon: '🛍️', points: 80, category: 'eco' },
  { id: 5, name: '环保书籍', icon: '📚', points: 180, category: 'education' },
  { id: 6, name: '神秘礼盒', icon: '🎁', points: 300, category: 'special' },
  { id: 7, name: '可降解餐具', icon: '🍴', points: 120, category: 'eco' },
  { id: 8, name: '太阳能充电器', icon: '🔋', points: 500, category: 'tech' },
]

const history = [
  { id: 1, type: 'earn', desc: '每日问答', points: 30, date: '今天' },
  { id: 2, type: 'earn', desc: '活动签到', points: 50, date: '昨天' },
  { id: 3, type: 'spend', desc: '兑换环保袋', points: -80, date: '3天前' },
  { id: 4, type: 'earn', desc: '专题问答', points: 40, date: '5天前' },
]

function canAfford(points) {
  return userPoints.value >= points
}

function exchange(reward) {
  if (canAfford(reward.points)) {
    alert(`成功兑换 ${reward.name}！`)
    userPoints.value -= reward.points
  }
}
</script>

<template>
  <div class="rewards-page">
    <!-- Points Header -->
    <header class="points-header">
      <div class="points-display">
        <div class="points-icon">🌱</div>
        <div class="points-info">
          <div class="points-label">我的积分</div>
          <div class="points-value">{{ userPoints }}</div>
        </div>
      </div>
      <button class="history-btn">积分明细</button>
    </header>

    <!-- Rewards Grid -->
    <section class="rewards-section">
      <h2>🎁 积分商城</h2>
      <div class="rewards-grid">
        <div 
          v-for="reward in rewards" 
          :key="reward.id" 
          class="reward-card"
          :class="{ disabled: !canAfford(reward.points) }"
          @click="exchange(reward)"
        >
          <div class="reward-icon">{{ reward.icon }}</div>
          <div class="reward-name">{{ reward.name }}</div>
          <div class="reward-points">
            <span class="points-icon">🌱</span>
            {{ reward.points }}
          </div>
        </div>
      </div>
    </section>

    <!-- History -->
    <section class="history-section">
      <h2>📊 积分记录</h2>
      <div class="history-list">
        <div v-for="item in history" :key="item.id" class="history-item">
          <div class="history-left">
            <span class="history-icon">{{ item.type === 'earn' ? '➕' : '➖' }}</span>
            <div>
              <div class="history-desc">{{ item.desc }}</div>
              <div class="history-date">{{ item.date }}</div>
            </div>
          </div>
          <div class="history-points" :class="{ earn: item.type === 'earn', spend: item.type === 'spend' }">
            {{ item.points > 0 ? '+' : '' }}{{ item.points }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rewards-page {
  min-height: 100vh;
  background: var(--color-bg, #f8fafc);
  padding-bottom: 80px;
}

.points-header {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  padding: 32px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-display {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.points-icon {
  font-size: 2.5rem;
}

.points-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.points-value {
  font-size: 2rem;
  font-weight: 700;
}

.history-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.rewards-section {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.rewards-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 16px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.reward-card {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.reward-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.reward-card.disabled {
  opacity: 0.5;
}

.reward-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.reward-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 8px;
}

.reward-points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
}

.history-section {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.history-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 16px;
}

.history-list {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  overflow: hidden;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.history-item:last-child {
  border-bottom: none;
}

.history-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-icon {
  font-size: 1rem;
}

.history-desc {
  font-size: 0.9375rem;
  color: var(--color-text, #1e293b);
}

.history-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
}

.history-points {
  font-weight: 600;
  font-size: 1rem;
}

.history-points.earn {
  color: #4caf50;
}

.history-points.spend {
  color: #f44336;
}
</style>