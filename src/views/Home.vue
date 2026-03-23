<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userName = ref('Alex')
const streak = ref(7)
const points = ref(120)
const dailyProgress = ref(3)
const dailyTotal = ref(5)

const dailyPercent = computed(() => Math.round((dailyProgress.value / dailyTotal.value) * 100))

const events = [
  { id: 1, title: 'Bondi海滩清洁', date: '3月25日', location: '悉尼', points: 50, icon: '🏖️', gradient: 'from-blue-400 to-cyan-300' },
  { id: 2, title: '社区植树日', date: '3月28日', location: '墨尔本', points: 60, icon: '🌳', gradient: 'from-green-400 to-emerald-300' },
  { id: 3, title: '电子垃圾回收', date: '4月2日', location: '布里斯班', points: 40, icon: '♻️', gradient: 'from-amber-400 to-yellow-300' },
]

const topics = [
  { id: 1, title: '气候变化', icon: '🌡️', count: 15 },
  { id: 2, title: '本土物种', icon: '🐨', count: 12 },
  { id: 3, title: '水资源', icon: '💧', count: 10 },
  { id: 4, title: '垃圾分类', icon: '♻️', count: 8 },
]
</script>

<template>
  <div class="home">
    <!-- Welcome Section -->
    <section class="welcome">
      <div class="container">
        <h1>👋 Good morning, {{ userName }}!</h1>
        <p class="streak">你已连续学习 <span class="highlight">{{ streak }} 天</span></p>
      </div>
    </section>

    <!-- Daily Quiz Card -->
    <section class="daily-quiz">
      <div class="container">
        <div class="quiz-card">
          <div class="quiz-header">
            <span class="quiz-icon">📝</span>
            <h2>今日问答</h2>
          </div>
          <p class="quiz-desc">
            完成 {{ dailyProgress }}/{{ dailyTotal }} 题，再答 {{ dailyTotal - dailyProgress }} 题获得 <strong>30 积分</strong>
          </p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: dailyPercent + '%' }"></div>
            <span class="progress-text">{{ dailyPercent }}%</span>
          </div>
          <button class="btn-start" @click="router.push('/quiz')">
            继续答题 →
          </button>
        </div>
      </div>
    </section>

    <!-- Points Overview -->
    <section class="points-section">
      <div class="container">
        <div class="points-card">
          <div class="points-info">
            <p class="points-label">你的积分</p>
            <p class="points-value">{{ points }} 🌱</p>
          </div>
          <div class="rank-info">
            <p class="rank-label">本周排名</p>
            <p class="rank-value">#42</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Hot Events -->
    <section class="events-section">
      <div class="container">
        <div class="section-header">
          <h2>📅 热门活动</h2>
          <router-link to="/events" class="view-all">查看全部 →</router-link>
        </div>
        <div class="events-scroll">
          <div v-for="event in events" :key="event.id" class="event-card">
            <div class="event-image" :class="event.gradient">
              <span class="event-icon">{{ event.icon }}</span>
            </div>
            <div class="event-info">
              <h3>{{ event.title }}</h3>
              <p class="event-meta">{{ event.date }} · {{ event.location }}</p>
              <span class="event-points">+{{ event.points }} 积分</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quiz Topics -->
    <section class="topics-section">
      <div class="container">
        <h2>📚 专题问答</h2>
        <div class="topics-grid">
          <div v-for="topic in topics" :key="topic.id" class="topic-card">
            <span class="topic-icon">{{ topic.icon }}</span>
            <h3>{{ topic.title }}</h3>
            <p class="topic-count">{{ topic.count }} 道题</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding-bottom: 80px;
}

.container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Welcome */
.welcome {
  padding: 24px 0;
}

.welcome h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 4px;
}

.streak {
  color: var(--color-text-secondary, #64748b);
}

.highlight {
  color: #4caf50;
  font-weight: 500;
}

/* Daily Quiz */
.daily-quiz {
  margin-bottom: 24px;
}

.quiz-card {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border-radius: 16px;
  padding: 20px;
  color: white;
  box-shadow: 0 10px 40px rgba(76, 175, 80, 0.3);
}

.quiz-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.quiz-icon {
  font-size: 1.5rem;
}

.quiz-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
}

.quiz-desc {
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 16px;
}

.quiz-desc strong {
  color: white;
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  padding: 4px 12px;
  margin-bottom: 16px;
}

.progress-fill {
  height: 8px;
  background: white;
  border-radius: 100px;
  flex: 1;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-start {
  background: white;
  color: #388e3c;
  border: none;
  padding: 10px 24px;
  border-radius: 100px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Points */
.points-section {
  margin-bottom: 24px;
}

.points-card {
  background: var(--color-surface, #f8fafc);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-label, .rank-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #64748b);
  margin-bottom: 4px;
}

.points-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #4caf50;
}

.rank-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
}

/* Events */
.events-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
}

.view-all {
  color: #4caf50;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.events-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}

.event-card {
  flex-shrink: 0;
  width: 160px;
  background: var(--color-surface, #f8fafc);
  border-radius: 12px;
  overflow: hidden;
}

.event-image {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-icon {
  font-size: 2.5rem;
}

.event-info {
  padding: 12px;
}

.event-info h3 {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
  margin-bottom: 8px;
}

.event-points {
  display: inline-block;
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 100px;
}

/* Topics */
.topics-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 12px;
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.topic-card {
  background: var(--color-surface, #f8fafc);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.topic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.topic-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

.topic-card h3 {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-secondary, #1b4965);
  margin-bottom: 4px;
}

.topic-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
}
</style>