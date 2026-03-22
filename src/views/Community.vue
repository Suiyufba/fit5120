<script setup>
import { ref } from 'vue'

const stories = [
  {
    name: 'Mia, 17',
    location: 'Gold Coast, QLD',
    avatar: '👩‍🦰',
    quote: 'I used to tan every weekend without sunscreen. After learning about UV risks at school, I completely changed my routine. Now I\'m the one reminding my friends to reapply!',
    tag: 'Behaviour Change'
  },
  {
    name: 'Jake, 16',
    location: 'Melbourne, VIC',
    avatar: '👦',
    quote: 'My dad was diagnosed with melanoma last year. It was a wake-up call for our whole family. I started using the UV tracker daily and it\'s become second nature.',
    tag: 'Family Impact'
  },
  {
    name: 'Priya, 18',
    location: 'Sydney, NSW',
    avatar: '👩',
    quote: 'I thought my darker skin meant I didn\'t need to worry about sun protection. Learning that was a myth was genuinely surprising. Everyone needs to protect their skin.',
    tag: 'Myth Busting'
  },
  {
    name: 'Tom, 15',
    location: 'Perth, WA',
    avatar: '🧑',
    quote: 'Our school started a "Sun Smart" club and we organise shade breaks during lunch. It\'s cool to see how small changes can make a big difference for everyone.',
    tag: 'School Initiative'
  }
]

const events = [
  {
    title: 'National Skin Cancer Action Week',
    date: 'November 2026',
    desc: 'Join thousands of Australians in raising awareness about skin cancer prevention and early detection.',
    icon: '🎗️',
    type: 'National'
  },
  {
    title: 'SunSmart School Challenge',
    date: 'Term 1, 2026',
    desc: 'Schools across Australia compete to create the most innovative sun safety campaigns. Open to all secondary schools.',
    icon: '🏫',
    type: 'Schools'
  },
  {
    title: 'UV Awareness Run',
    date: 'March 2026',
    desc: 'A community fun run that raises funds for melanoma research. Participants get sun-safe goodie bags!',
    icon: '🏃',
    type: 'Community'
  },
  {
    title: 'Free Skin Check Clinics',
    date: 'Ongoing',
    desc: 'Partner clinics offer free skin checks for young Australians aged 15-25. Find a clinic near you.',
    icon: '🏥',
    type: 'Health'
  }
]

const resources = [
  {
    title: 'Cancer Council Australia',
    desc: 'Official sun protection guidelines, research updates, and educational materials.',
    url: 'https://www.cancer.org.au',
    icon: '🔗'
  },
  {
    title: 'SunSmart App',
    desc: 'Download the SunSmart app for real-time UV alerts and sun protection reminders.',
    url: 'https://www.sunsmart.com.au',
    icon: '📱'
  },
  {
    title: 'Melanoma Institute Australia',
    desc: 'Leading melanoma research, treatment information, and patient support services.',
    url: 'https://www.melanoma.org.au',
    icon: '🔬'
  },
  {
    title: 'Australian Bureau of Meteorology',
    desc: 'Daily UV Index forecasts and weather data for all Australian locations.',
    url: 'http://www.bom.gov.au',
    icon: '🌤️'
  }
]

const pledgeItems = [
  'Check the UV Index before going outdoors',
  'Apply sunscreen as part of my daily routine',
  'Wear a hat and sunglasses in the sun',
  'Encourage friends and family to be sun safe',
  'Schedule regular skin checks'
]

const pledgeChecked = ref([])
const showPledgeSuccess = ref(false)

function togglePledge(index) {
  const idx = pledgeChecked.value.indexOf(index)
  if (idx > -1) {
    pledgeChecked.value.splice(idx, 1)
  } else {
    pledgeChecked.value.push(index)
  }
  showPledgeSuccess.value = false
}

function submitPledge() {
  if (pledgeChecked.value.length > 0) {
    showPledgeSuccess.value = true
  }
}
</script>

<template>
  <div class="page">
    <section class="page-header">
      <div class="container">
        <span class="page-badge">Together</span>
        <h1>Community</h1>
        <p>Join the movement to protect young Australians from skin cancer.</p>
      </div>
    </section>

    <div class="container page-body">
      <!-- Community Stories -->
      <h2 class="section-title">Real Stories</h2>
      <p class="section-subtitle">Hear from young Australians who've made sun safety part of their lives.</p>
      <div class="stories-grid">
        <div v-for="(story, index) in stories" :key="index" class="story-card">
          <div class="story-header">
            <span class="story-avatar">{{ story.avatar }}</span>
            <div>
              <h4>{{ story.name }}</h4>
              <span class="story-location">{{ story.location }}</span>
            </div>
            <span class="story-tag">{{ story.tag }}</span>
          </div>
          <p class="story-quote">"{{ story.quote }}"</p>
        </div>
      </div>

      <!-- Events -->
      <h2 class="section-title">Events & Campaigns</h2>
      <p class="section-subtitle">Get involved in sun safety events happening across Australia.</p>
      <div class="events-grid">
        <div v-for="(event, index) in events" :key="index" class="event-card">
          <div class="event-icon">{{ event.icon }}</div>
          <div class="event-content">
            <div class="event-meta">
              <span class="event-type">{{ event.type }}</span>
              <span class="event-date">{{ event.date }}</span>
            </div>
            <h3>{{ event.title }}</h3>
            <p>{{ event.desc }}</p>
          </div>
        </div>
      </div>

      <!-- Sun Safe Pledge -->
      <div class="pledge-section">
        <div class="pledge-content">
          <h2>Take the Sun Safe Pledge</h2>
          <p>Commit to protecting your skin. Check the actions you'll take:</p>
          <div class="pledge-items">
            <label
              v-for="(item, index) in pledgeItems"
              :key="index"
              class="pledge-item"
              :class="{ checked: pledgeChecked.includes(index) }"
            >
              <input
                type="checkbox"
                :checked="pledgeChecked.includes(index)"
                @change="togglePledge(index)"
              />
              <span class="checkmark"></span>
              <span>{{ item }}</span>
            </label>
          </div>
          <button
            class="btn btn-primary"
            :disabled="pledgeChecked.length === 0"
            @click="submitPledge"
          >
            I Pledge to Be Sun Safe
          </button>
          <div v-if="showPledgeSuccess" class="pledge-success">
            Thank you for taking the pledge! Share it with your friends and family.
          </div>
        </div>
      </div>

      <!-- Resources -->
      <h2 class="section-title">Helpful Resources</h2>
      <p class="section-subtitle">Trusted organisations and tools for sun safety information.</p>
      <div class="resources-grid">
        <a
          v-for="(resource, index) in resources"
          :key="index"
          :href="resource.url"
          target="_blank"
          rel="noopener noreferrer"
          class="resource-card"
        >
          <span class="resource-icon">{{ resource.icon }}</span>
          <div>
            <h4>{{ resource.title }}</h4>
            <p>{{ resource.desc }}</p>
          </div>
          <span class="resource-arrow">→</span>
        </a>
      </div>

      <!-- Share CTA -->
      <div class="cta-section">
        <h2>Spread the Word</h2>
        <p>Help us protect more young Australians. Share sun safety tips with your friends, family, and school community.</p>
        <div class="cta-actions">
          <router-link to="/raising-awareness" class="btn btn-primary">Learn More →</router-link>
          <router-link to="/prevention" class="btn btn-outline">Prevention Tips</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  background: linear-gradient(135deg, #1B4965 0%, #2D6A8F 100%);
  padding: 60px 0;
  color: white;
}
.page-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(255,255,255,0.15);
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.page-header h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
.page-header p { font-size: 1.1rem; opacity: 0.85; }
.page-body { padding: 60px 0; }

.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-secondary);
  margin-bottom: 8px;
}
.section-subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 28px;
}

/* Stories */
.stories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 56px;
}
.story-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s;
}
.story-card:hover { transform: translateY(-3px); }
.story-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.story-avatar { font-size: 2.2rem; }
.story-header h4 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
}
.story-location {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
.story-tag {
  margin-left: auto;
  padding: 3px 10px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 100px;
  white-space: nowrap;
}
.story-quote {
  font-size: 0.92rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-style: italic;
}

/* Events */
.events-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 56px;
}
.event-card {
  display: flex;
  gap: 20px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: transform 0.2s;
}
.event-card:hover { transform: translateY(-3px); }
.event-icon {
  font-size: 2rem;
  flex-shrink: 0;
}
.event-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.event-type {
  padding: 2px 8px;
  background: #EFF6FF;
  color: #2563EB;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 100px;
  text-transform: uppercase;
}
.event-date {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
.event-content h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-secondary);
  margin-bottom: 6px;
}
.event-content p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* Pledge */
.pledge-section {
  background: linear-gradient(135deg, #1B4965 0%, #2D6A8F 100%);
  border-radius: var(--radius-xl);
  padding: 48px;
  margin-bottom: 56px;
  color: white;
}
.pledge-content { max-width: 560px; margin: 0 auto; text-align: center; }
.pledge-content h2 {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 10px;
}
.pledge-content > p {
  opacity: 0.85;
  margin-bottom: 28px;
}
.pledge-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
  text-align: left;
}
.pledge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.95rem;
}
.pledge-item:hover { background: rgba(255,255,255,0.15); }
.pledge-item.checked { background: rgba(255,255,255,0.2); }
.pledge-item input { display: none; }
.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255,255,255,0.5);
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.pledge-item.checked .checkmark {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.pledge-item.checked .checkmark::after {
  content: '✓';
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
}
.pledge-section .btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 14px 32px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35);
}
.pledge-section .btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}
.pledge-section .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.pledge-success {
  margin-top: 20px;
  padding: 14px 20px;
  background: rgba(6, 214, 160, 0.2);
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.9rem;
}

/* Resources */
.resources-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 56px;
}
.resource-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  text-decoration: none;
  transition: all 0.2s;
}
.resource-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
  transform: translateX(4px);
}
.resource-icon { font-size: 1.8rem; flex-shrink: 0; }
.resource-card h4 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}
.resource-card p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.resource-arrow {
  margin-left: auto;
  font-size: 1.2rem;
  color: var(--color-primary);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
.resource-card:hover .resource-arrow { opacity: 1; }

/* CTA */
.cta-section {
  text-align: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 209, 102, 0.08) 100%);
  border-radius: var(--radius-xl);
}
.cta-section h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-secondary);
  margin-bottom: 12px;
}
.cta-section p {
  color: var(--color-text-secondary);
  margin-bottom: 28px;
  font-size: 1.05rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
.cta-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}
.btn-primary {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35);
}
.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}
.btn-outline {
  background: transparent;
  color: var(--color-secondary);
  border: 2px solid var(--color-border);
}
.btn-outline:hover {
  border-color: var(--color-secondary);
  background: rgba(27, 73, 101, 0.05);
}

@media (max-width: 768px) {
  .stories-grid { grid-template-columns: 1fr; }
  .events-grid { grid-template-columns: 1fr; }
  .pledge-section { padding: 32px 20px; }
  .cta-actions { flex-direction: column; align-items: center; }
  .page-header h1 { font-size: 2rem; }
}
</style>
