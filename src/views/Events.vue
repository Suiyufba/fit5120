<script setup>
import { ref } from 'vue'

const activeCity = ref('all')
const activeType = ref('all')

const cities = [
  { id: 'all', name: '全部' },
  { id: 'sydney', name: '悉尼' },
  { id: 'melbourne', name: '墨尔本' },
  { id: 'brisbane', name: '布里斯班' },
]

const types = [
  { id: 'all', name: '全部' },
  { id: 'cleanup', name: '清洁' },
  { id: 'planting', name: '种植' },
  { id: 'workshop', name: '讲座' },
  { id: 'recycling', name: '回收' },
]

const events = [
  {
    id: 1,
    title: 'Bondi海滩清洁行动',
    description: '加入我们，一起清理Bondi海滩的垃圾，保护海洋生物',
    date: '2024年3月25日',
    time: '09:00 - 12:00',
    location: 'Bondi Beach, Sydney',
    city: 'sydney',
    type: 'cleanup',
    points: 50,
    spots: 12,
    totalSpots: 50,
    image: '🏖️'
  },
  {
    id: 2,
    title: '社区植树日',
    description: '在Royal Botanic Garden种植本土树木，为城市增添绿色',
    date: '2024年3月28日',
    time: '10:00 - 14:00',
    location: 'Royal Botanic Garden, Melbourne',
    city: 'melbourne',
    type: 'planting',
    points: 60,
    spots: 30,
    totalSpots: 100,
    image: '🌳'
  },
  {
    id: 3,
    title: '电子垃圾回收日',
    description: '正确处理旧电子产品，防止有害物质污染环境',
    date: '2024年4月2日',
    time: '08:00 - 16:00',
    location: 'South Bank, Brisbane',
    city: 'brisbane',
    type: 'recycling',
    points: 40,
    spots: 50,
    totalSpots: 100,
    image: '♻️'
  },
  {
    id: 4,
    title: '气候变化讲座',
    description: '了解澳大利亚气候变化的影响和应对策略',
    date: '2024年4月5日',
    time: '18:00 - 20:00',
    location: 'Sydney Town Hall',
    city: 'sydney',
    type: 'workshop',
    points: 30,
    spots: 80,
    totalSpots: 150,
    image: '🎓'
  },
  {
    id: 5,
    title: '考拉栖息地保护',
    description: '参与考拉栖息地的清理和保护工作',
    date: '2024年4月10日',
    time: '09:00 - 15:00',
    location: 'Lone Pine Koala Sanctuary, Brisbane',
    city: 'brisbane',
    type: 'cleanup',
    points: 70,
    spots: 20,
    totalSpots: 40,
    image: '🐨'
  },
]

const filteredEvents = ref(events)

function filterByCity(cityId) {
  activeCity.value = cityId
  applyFilters()
}

function filterByType(typeId) {
  activeType.value = typeId
  applyFilters()
}

function applyFilters() {
  filteredEvents.value = events.filter(event => {
    const cityMatch = activeCity.value === 'all' || event.city === activeCity.value
    const typeMatch = activeType.value === 'all' || event.type === activeType.value
    return cityMatch && typeMatch
  })
}
</script>

<template>
  <div class="events-page">
    <!-- Header -->
    <header class="page-header">
      <h1>活动中心</h1>
      <p>参与环保活动，赚取积分</p>
    </header>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-section">
        <div class="filter-label">城市</div>
        <div class="filter-chips">
          <button
            v-for="city in cities"
            :key="city.id"
            class="chip"
            :class="{ active: activeCity === city.id }"
            @click="filterByCity(city.id)"
          >
            {{ city.name }}
          </button>
        </div>
      </div>
      <div class="filter-section">
        <div class="filter-label">类型</div>
        <div class="filter-chips">
          <button
            v-for="type in types"
            :key="type.id"
            class="chip"
            :class="{ active: activeType === type.id }"
            @click="filterByType(type.id)"
          >
            {{ type.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Events List -->
    <div class="events-list">
      <div v-for="event in filteredEvents" :key="event.id" class="event-card">
        <div class="event-image">
          <span class="event-icon">{{ event.image }}</span>
        </div>
        <div class="event-details">
          <div class="event-header">
            <h3>{{ event.title }}</h3>
            <span class="points-badge">+{{ event.points }} 积分</span>
          </div>
          <p class="event-description">{{ event.description }}</p>
          <div class="event-meta">
            <div class="meta-item">
              <span class="meta-icon">📅</span>
              <span>{{ event.date }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">⏰</span>
              <span>{{ event.time }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">📍</span>
              <span>{{ event.location }}</span>
            </div>
          </div>
          <div class="event-footer">
            <div class="spots-info">
              <div class="spots-bar">
                <div class="spots-fill" :style="{ width: ((event.totalSpots - event.spots) / event.totalSpots * 100) + '%' }"></div>
              </div>
              <span class="spots-text">剩余 {{ event.spots }} 个名额</span>
            </div>
            <button class="register-btn">报名</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredEvents.length === 0" class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>没有找到符合条件的活动</p>
        <button class="reset-btn" @click="activeCity = 'all'; activeType = 'all'; applyFilters()">
          重置筛选
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.events-page {
  min-height: 100vh;
  background: var(--color-bg, #f8fafc);
  padding-bottom: 80px;
}

.page-header {
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  color: white;
  padding: 32px 16px;
  text-align: center;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-header p {
  opacity: 0.9;
  font-size: 0.9375rem;
}

.filters {
  background: var(--color-surface, #ffffff);
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.filter-section {
  margin-bottom: 12px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.chip {
  flex-shrink: 0;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s;
}

.chip.active {
  background: #4caf50;
  color: white;
}

.events-list {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.event-card {
  background: var(--color-surface, #ffffff);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.event-image {
  height: 120px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-icon {
  font-size: 4rem;
}

.event-details {
  padding: 16px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.event-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-secondary, #1b4965);
  flex: 1;
}

.points-badge {
  flex-shrink: 0;
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
  margin-left: 8px;
}

.event-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #64748b);
  line-height: 1.5;
  margin-bottom: 12px;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--color-text-secondary, #64748b);
}

.meta-icon {
  font-size: 1rem;
}

.event-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.spots-info {
  flex: 1;
}

.spots-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  margin-bottom: 4px;
  overflow: hidden;
}

.spots-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 3px;
}

.spots-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary, #64748b);
}

.register-btn {
  padding: 10px 24px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.register-btn:hover {
  background: #388e3c;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  display: block;
}

.empty-state p {
  color: var(--color-text-secondary, #64748b);
  margin-bottom: 16px;
}

.reset-btn {
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #64748b);
  cursor: pointer;
}
</style>