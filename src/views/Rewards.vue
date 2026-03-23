<script setup>
import { ref } from 'vue'

const userPoints = ref(120)

const rewards = [
  { id: 1, name: 'Reusable Coffee Cup', icon: '☕', points: 100, category: 'Sustainable Living' },
  { id: 2, name: 'Native Seedling Kit', icon: '🌱', points: 150, category: 'Nature' },
  { id: 3, name: 'Eco Cinema Voucher', icon: '🎬', points: 200, category: 'Experience' },
  { id: 4, name: 'Organic Tote Bag', icon: '🛍️', points: 80, category: 'Sustainable Living' },
  { id: 5, name: 'Conservation Book', icon: '📖', points: 180, category: 'Education' },
  { id: 6, name: 'Mystery Eco Box', icon: '📦', points: 300, category: 'Special' },
  { id: 7, name: 'Bamboo Cutlery Set', icon: '🍴', points: 120, category: 'Sustainable Living' },
  { id: 8, name: 'Solar Power Bank', icon: '🔋', points: 500, category: 'Tech' },
]

const history = [
  { id: 1, type: 'earn', desc: 'Daily Eco Quiz', points: 30, date: 'Today' },
  { id: 2, type: 'earn', desc: 'Beach Clean-Up Event', points: 50, date: 'Yesterday' },
  { id: 3, type: 'spend', desc: 'Redeemed Organic Tote Bag', points: -80, date: '3 days ago' },
  { id: 4, type: 'earn', desc: 'Wildlife Quiz Challenge', points: 40, date: '5 days ago' },
  { id: 5, type: 'earn', desc: 'Referred a friend', points: 25, date: '1 week ago' },
]

function canAfford(points) {
  return userPoints.value >= points
}

function exchange(reward) {
  if (canAfford(reward.points)) {
    userPoints.value -= reward.points
  }
}
</script>

<template>
  <div class="rewards-page">
    <!-- Page Hero -->
    <div class="page-hero">
      <div class="page-hero-bg"></div>
      <div class="page-hero-content">
        <span class="page-tag">Eco Points</span>
        <h1>Green Rewards</h1>
        <p>Earn points through quizzes and activities. Redeem them for sustainable products and experiences.</p>
      </div>
    </div>

    <div class="rewards-body">
      <!-- Points Overview -->
      <div class="points-overview">
        <div class="points-main">
          <div class="po-label">Your Balance</div>
          <div class="po-value">{{ userPoints }}</div>
          <div class="po-unit">eco-points</div>
        </div>
        <div class="points-ways">
          <div class="pw-item">
            <div class="pw-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.2"/>
                <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <strong>Take Quizzes</strong>
              <span>Up to 50 pts/day</span>
            </div>
          </div>
          <div class="pw-item">
            <div class="pw-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.2"/>
                <path d="M10 6v4l3 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <strong>Join Events</strong>
              <span>30–70 pts each</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Two-column layout: Store + History -->
      <div class="rewards-two-col">
        <div class="rewards-main">
          <section class="store-section">
            <div class="store-header">
              <h2>Rewards Store</h2>
              <p>{{ rewards.length }} items available</p>
            </div>
            <div class="rewards-grid">
              <div
                v-for="reward in rewards"
                :key="reward.id"
                class="reward-card"
                :class="{ locked: !canAfford(reward.points) }"
              >
                <div class="reward-icon-area">
                  <span class="reward-emoji">{{ reward.icon }}</span>
                </div>
                <div class="reward-info">
                  <span class="reward-category">{{ reward.category }}</span>
                  <h4>{{ reward.name }}</h4>
                  <div class="reward-bottom">
                    <span class="reward-cost">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.2"/>
                        <circle cx="8" cy="8" r="3" fill="currentColor"/>
                      </svg>
                      {{ reward.points }} pts
                    </span>
                    <button
                      class="btn-redeem"
                      :disabled="!canAfford(reward.points)"
                      @click="exchange(reward)"
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="rewards-aside">
          <section class="history-section">
            <h2>Recent Activity</h2>
            <div class="history-list">
              <div v-for="item in history" :key="item.id" class="history-row">
                <div class="history-indicator" :class="item.type"></div>
                <div class="history-info">
                  <span class="history-desc">{{ item.desc }}</span>
                  <span class="history-date">{{ item.date }}</span>
                </div>
                <span class="history-amount" :class="item.type">
                  {{ item.points > 0 ? '+' : '' }}{{ item.points }} pts
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rewards-page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* Hero */
.page-hero {
  position: relative;
  padding: 80px 24px 56px;
  text-align: center;
  overflow: hidden;
}

.page-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(184, 134, 11, 0.06) 0%, var(--color-bg) 100%);
}

.page-hero-content {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.page-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-ochre);
  background: var(--color-surface);
  padding: 5px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 16px;
}

.page-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
}

.page-hero p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

/* Body */
.rewards-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px 80px;
}

.rewards-two-col {
  display: flex;
  gap: 36px;
  align-items: flex-start;
}

.rewards-main {
  flex: 1;
  min-width: 0;
}

.rewards-aside {
  width: 360px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
}

/* Points Overview */
.points-overview {
  display: flex;
  align-items: center;
  gap: 32px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  padding: 32px;
  margin-bottom: 48px;
}

.points-main {
  text-align: center;
  padding-right: 32px;
  border-right: 1px solid var(--color-border-light);
}

.po-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.po-value {
  font-family: var(--font-display);
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 2px;
}

.po-unit {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.points-ways {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pw-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pw-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-muted);
  border-radius: var(--radius-md);
  color: var(--color-primary);
}

.pw-item strong {
  display: block;
  font-size: 0.88rem;
  color: var(--color-text);
}

.pw-item span {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

/* Store */
.store-section {
  margin-bottom: 48px;
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20px;
}

.store-header h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.store-header p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.reward-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s var(--ease-out-expo);
}

.reward-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.reward-card.locked {
  opacity: 0.55;
}

.reward-card.locked:hover {
  transform: none;
  box-shadow: none;
}

.reward-icon-area {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-warm);
  font-size: 2.4rem;
}

.reward-info {
  padding: 16px;
}

.reward-category {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.reward-info h4 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 4px 0 12px;
}

.reward-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reward-cost {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary);
}

.btn-redeem {
  padding: 6px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-redeem:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-redeem:disabled {
  background: var(--color-border);
  cursor: not-allowed;
}

/* History */
.history-section h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 20px;
}

.history-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border-light);
  transition: background 0.15s;
}

.history-row:last-child {
  border-bottom: none;
}

.history-row:hover {
  background: var(--color-bg-warm);
}

.history-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.history-indicator.earn {
  background: var(--color-success);
}

.history-indicator.spend {
  background: var(--color-secondary);
}

.history-info {
  flex: 1;
}

.history-desc {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 2px;
}

.history-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.history-amount {
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
}

.history-amount.earn {
  color: var(--color-success);
}

.history-amount.spend {
  color: var(--color-secondary);
}

@media (max-width: 1024px) {
  .rewards-two-col {
    flex-direction: column;
  }

  .rewards-aside {
    width: 100%;
    position: static;
  }

  .rewards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .rewards-body {
    padding: 0 16px 64px;
  }

  .points-overview {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }

  .points-main {
    padding-right: 0;
    border-right: none;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--color-border-light);
  }

  .rewards-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .page-hero {
    padding: 48px 16px 40px;
  }

  .history-row {
    padding: 14px 16px;
  }
}

@media (max-width: 480px) {
  .rewards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
