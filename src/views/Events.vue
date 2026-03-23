<script setup>
import { ref, computed } from 'vue'

const activeCity = ref('all')
const activeType = ref('all')

const cities = [
  { id: 'all', name: 'All Cities' },
  { id: 'sydney', name: 'Sydney' },
  { id: 'melbourne', name: 'Melbourne' },
  { id: 'brisbane', name: 'Brisbane' },
  { id: 'cairns', name: 'Cairns' },
]

const types = [
  { id: 'all', name: 'All Types' },
  { id: 'cleanup', name: 'Clean-Up' },
  { id: 'planting', name: 'Planting' },
  { id: 'workshop', name: 'Workshop' },
  { id: 'recycling', name: 'Recycling' },
  { id: 'conservation', name: 'Conservation' },
]

const events = [
  {
    id: 1,
    title: 'Bondi Beach Clean-Up Day',
    description: 'Join volunteers to remove plastic waste and debris from one of Australia\'s most iconic beaches. Equipment and refreshments provided.',
    date: 'April 5, 2026',
    time: '9:00 AM – 12:00 PM',
    location: 'Bondi Beach, Sydney',
    city: 'sydney',
    type: 'cleanup',
    points: 50,
    spots: 12,
    totalSpots: 50,
    gradient: 'linear-gradient(135deg, #0f4c5c 0%, #1a7a8a 100%)',
  },
  {
    id: 2,
    title: 'Native Tree Planting Day',
    description: 'Help plant 500 native eucalyptus and banksia trees at Royal Botanic Gardens to restore urban biodiversity and provide wildlife corridors.',
    date: 'April 12, 2026',
    time: '10:00 AM – 2:00 PM',
    location: 'Royal Botanic Gardens, Melbourne',
    city: 'melbourne',
    type: 'planting',
    points: 60,
    spots: 30,
    totalSpots: 100,
    gradient: 'linear-gradient(135deg, #1a5632 0%, #2d7a4f 100%)',
  },
  {
    id: 3,
    title: 'E-Waste Recycling Drive',
    description: 'Dispose of old electronics responsibly. Bring phones, laptops, batteries, and cables — all processed through certified recyclers.',
    date: 'April 19, 2026',
    time: '8:00 AM – 4:00 PM',
    location: 'South Bank Parklands, Brisbane',
    city: 'brisbane',
    type: 'recycling',
    points: 40,
    spots: 50,
    totalSpots: 100,
    gradient: 'linear-gradient(135deg, #b8860b 0%, #d4a52e 100%)',
  },
  {
    id: 4,
    title: 'Climate Action Workshop',
    description: 'Learn about Australia\'s climate challenges and discover actionable steps you can take. Featuring expert speakers and interactive sessions.',
    date: 'April 26, 2026',
    time: '6:00 PM – 8:30 PM',
    location: 'Sydney Town Hall, Sydney',
    city: 'sydney',
    type: 'workshop',
    points: 30,
    spots: 80,
    totalSpots: 150,
    gradient: 'linear-gradient(135deg, #c4652e 0%, #d4845f 100%)',
  },
  {
    id: 5,
    title: 'Koala Habitat Restoration',
    description: 'Volunteer at Lone Pine Koala Sanctuary to help clear invasive plants and restore natural koala habitats in surrounding forests.',
    date: 'May 3, 2026',
    time: '9:00 AM – 3:00 PM',
    location: 'Lone Pine Sanctuary, Brisbane',
    city: 'brisbane',
    type: 'conservation',
    points: 70,
    spots: 20,
    totalSpots: 40,
    gradient: 'linear-gradient(135deg, #2d7a4f 0%, #4a9968 100%)',
  },
  {
    id: 6,
    title: 'Reef Awareness Snorkel Day',
    description: 'Guided snorkelling tour focused on coral reef health, followed by a talk on reef conservation efforts and how to help from home.',
    date: 'May 10, 2026',
    time: '7:00 AM – 1:00 PM',
    location: 'Green Island, Cairns',
    city: 'cairns',
    type: 'workshop',
    points: 55,
    spots: 15,
    totalSpots: 30,
    gradient: 'linear-gradient(135deg, #0f4c5c 0%, #2d9aaa 100%)',
  },
]

const filteredEvents = computed(() => {
  return events.filter(event => {
    const cityMatch = activeCity.value === 'all' || event.city === activeCity.value
    const typeMatch = activeType.value === 'all' || event.type === activeType.value
    return cityMatch && typeMatch
  })
})

function resetFilters() {
  activeCity.value = 'all'
  activeType.value = 'all'
}
</script>

<template>
  <div class="events-page">
    <!-- Page Header -->
    <div class="page-hero">
      <div class="page-hero-bg"></div>
      <div class="page-hero-content">
        <span class="page-tag">Community Action</span>
        <h1>Green Activities</h1>
        <p>Join environmental events across Australia. Earn eco-points while making a real difference for our planet.</p>
      </div>
    </div>

    <div class="events-body">
      <!-- Filters -->
      <aside class="filters-panel">
        <div class="filter-group">
          <h3>City</h3>
          <div class="filter-options">
            <button
              v-for="city in cities"
              :key="city.id"
              class="filter-chip"
              :class="{ active: activeCity === city.id }"
              @click="activeCity = city.id"
            >
              {{ city.name }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <h3>Activity Type</h3>
          <div class="filter-options">
            <button
              v-for="type in types"
              :key="type.id"
              class="filter-chip"
              :class="{ active: activeType === type.id }"
              @click="activeType = type.id"
            >
              {{ type.name }}
            </button>
          </div>
        </div>
      </aside>

      <!-- Events Grid -->
      <div class="events-main">
        <div class="events-count">
          {{ filteredEvents.length }} activit{{ filteredEvents.length === 1 ? 'y' : 'ies' }} found
        </div>

        <div class="events-grid">
          <article v-for="event in filteredEvents" :key="event.id" class="event-card">
            <div class="event-visual" :style="{ background: event.gradient }">
              <span class="event-type-tag">{{ types.find(t => t.id === event.type)?.name }}</span>
              <div class="event-points-tag">+{{ event.points }} pts</div>
            </div>
            <div class="event-content">
              <h3>{{ event.title }}</h3>
              <p class="event-desc">{{ event.description }}</p>
              <div class="event-details">
                <div class="event-detail">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M2 7h12M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  </svg>
                  <span>{{ event.date }}</span>
                </div>
                <div class="event-detail">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M8 5v3l2.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>{{ event.time }}</span>
                </div>
                <div class="event-detail">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" stroke="currentColor" stroke-width="1.2"/>
                    <circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/>
                  </svg>
                  <span>{{ event.location }}</span>
                </div>
              </div>
              <div class="event-bottom">
                <div class="spots-meter">
                  <div class="spots-bar">
                    <div class="spots-fill" :style="{ width: ((event.totalSpots - event.spots) / event.totalSpots * 100) + '%' }"></div>
                  </div>
                  <span class="spots-label">{{ event.spots }} spots remaining</span>
                </div>
                <button class="btn-register">Register</button>
              </div>
            </div>
          </article>
        </div>

        <!-- Empty State -->
        <div v-if="filteredEvents.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="20" stroke="var(--color-text-muted)" stroke-width="1.5"/>
            <path d="M18 30s2-3 6-3 6 3 6 3M17 19h2M29 19h2" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <h3>No activities found</h3>
          <p>Try adjusting your filters to discover more events.</p>
          <button class="btn-reset" @click="resetFilters">Reset Filters</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.events-page {
  min-height: 100vh;
  background: var(--color-bg);
}

/* Page Hero */
.page-hero {
  position: relative;
  padding: 80px 24px 56px;
  text-align: center;
  overflow: hidden;
}

.page-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--color-primary-muted) 0%, var(--color-bg) 100%);
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
  color: var(--color-primary);
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

/* Layout */
.events-body {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px 80px;
  display: flex;
  gap: 36px;
}

.filters-panel {
  width: 240px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  align-self: flex-start;
}

.filter-group {
  margin-bottom: 28px;
}

.filter-group h3 {
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  padding: 7px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: var(--color-primary-light);
  color: var(--color-primary);
}

.filter-chip.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

/* Events Main */
.events-main {
  flex: 1;
  min-width: 0;
}

.events-count {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 20px;
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.event-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all 0.4s var(--ease-out-expo);
}

.event-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.event-visual {
  width: 100%;
  height: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  position: relative;
}

.event-type-tag {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  padding: 5px 10px;
  border-radius: var(--radius-full);
  align-self: flex-start;
}

.event-points-tag {
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  align-self: flex-end;
}

.event-content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.event-content h3 {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.event-desc {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.event-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.event-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.event-detail svg {
  flex-shrink: 0;
}

.event-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}

.spots-meter {
  flex: 1;
}

.spots-bar {
  height: 4px;
  background: var(--color-border-light);
  border-radius: 2px;
  margin-bottom: 4px;
  overflow: hidden;
}

.spots-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.4s var(--ease-out-expo);
}

.spots-label {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.btn-register {
  padding: 10px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
  margin-left: 16px;
}

.btn-register:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 64px 24px;
}

.empty-state svg {
  margin-bottom: 16px;
}

.empty-state h3 {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--color-text);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin-bottom: 20px;
}

.btn-reset {
  padding: 10px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.btn-reset:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (min-width: 1200px) {
  .events-grid {
    gap: 24px;
  }

  .event-visual {
    height: 180px;
  }
}

@media (max-width: 1024px) {
  .events-grid {
    grid-template-columns: 1fr;
  }

  .event-card {
    flex-direction: row;
  }

  .event-visual {
    width: 200px;
    height: auto;
    min-height: 200px;
  }
}

@media (max-width: 768px) {
  .events-body {
    flex-direction: column;
    padding: 0 16px 64px;
  }

  .filters-panel {
    width: 100%;
    position: static;
  }

  .filter-options {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .filter-chip {
    flex-shrink: 0;
  }

  .event-card {
    flex-direction: column;
  }

  .event-visual {
    width: 100%;
    height: 140px;
  }

  .page-hero {
    padding: 48px 16px 40px;
  }
}
</style>
