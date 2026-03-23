<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const climateStats = [
  { value: '1.47°C', label: 'Warmer since 1910', desc: 'Australia\'s mean temperature has risen significantly above the 1961–1990 average.' },
  { value: '11–23%', label: 'Rainfall decline (SE)', desc: 'Late autumn and winter rainfall in southeast Australia has dropped since the 1990s.' },
  { value: '1,900+', label: 'Species at risk', desc: 'Over 1,900 species and ecological communities are listed as threatened under national law.' },
  { value: '30 cm', label: 'Sea level rise since 1880', desc: 'Oceans around Australia have risen roughly 30 cm, threatening coastal ecosystems.' },
]

const features = [
  {
    id: 'quiz',
    title: 'Eco Quiz Challenge',
    subtitle: 'Test Your Knowledge',
    desc: 'Answer questions about Australia\'s climate, wildlife, and sustainability. Earn points for every correct answer and climb the leaderboard.',
    cta: 'Start a Quiz',
    link: '/quiz',
    accent: 'var(--color-primary)',
    accentBg: 'var(--color-primary-muted)',
    icon: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="6" width="36" height="36" rx="8" stroke="currentColor" stroke-width="2"/><path d="M20 18h8M20 24h12M20 30h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="18" r="1.5" fill="currentColor"/><circle cx="15" cy="24" r="1.5" fill="currentColor"/><circle cx="15" cy="30" r="1.5" fill="currentColor"/></svg>`
  },
  {
    id: 'events',
    title: 'Green Activities',
    subtitle: 'Take Real Action',
    desc: 'Join beach clean-ups, tree planting days, wildlife conservation programs, and sustainability workshops happening across Australia.',
    cta: 'Browse Activities',
    link: '/events',
    accent: 'var(--color-secondary)',
    accentBg: 'var(--color-secondary-muted)',
    icon: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 8c-4 6-12 10-12 20a12 12 0 0024 0c0-10-8-14-12-20z" stroke="currentColor" stroke-width="2"/><path d="M24 28v-8M20 24l4-4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  },
  {
    id: 'rewards',
    title: 'Green Rewards',
    subtitle: 'Earn & Redeem',
    desc: 'Accumulate eco-points through quizzes and event participation. Redeem them for sustainable products, vouchers, and exclusive experiences.',
    cta: 'View Rewards',
    link: '/rewards',
    accent: 'var(--color-ochre)',
    accentBg: 'rgba(184, 134, 11, 0.08)',
    icon: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2"/><path d="M24 14v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.3"/></svg>`
  },
]

const highlights = [
  {
    title: 'Great Barrier Reef',
    location: 'Queensland Coast',
    desc: 'The world\'s largest coral reef system, stretching over 2,300 km. Rising ocean temperatures have caused multiple mass bleaching events since 2016.',
    tag: 'Marine',
    gradient: 'linear-gradient(135deg, #0f4c5c 0%, #1a7a8a 50%, #2d9aaa 100%)',
  },
  {
    title: 'Bushfire Seasons',
    location: 'Nationwide',
    desc: 'Australia\'s Black Summer (2019–20) burned over 18.6 million hectares, destroying habitats and releasing 830 million tonnes of CO₂.',
    tag: 'Climate',
    gradient: 'linear-gradient(135deg, #c4652e 0%, #d4845f 50%, #e8a87c 100%)',
  },
  {
    title: 'Native Wildlife',
    location: 'Across Australia',
    desc: 'Home to unique species like koalas, platypuses, and Tasmanian devils. Habitat loss and climate change threaten their survival.',
    tag: 'Biodiversity',
    gradient: 'linear-gradient(135deg, #1a5632 0%, #2d7a4f 50%, #4a9968 100%)',
  },
]

const upcomingEvents = [
  { title: 'Bondi Beach Clean-Up', date: 'Apr 5, 2026', location: 'Sydney, NSW', points: 50, spots: 23 },
  { title: 'Native Tree Planting Day', date: 'Apr 12, 2026', location: 'Melbourne, VIC', points: 60, spots: 45 },
  { title: 'Reef Awareness Workshop', date: 'Apr 19, 2026', location: 'Cairns, QLD', points: 40, spots: 18 },
]
</script>

<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
        <div class="hero-pattern"></div>
        <div class="hero-grain"></div>
      </div>
      <div class="hero-content">
        <div class="hero-label animate-in">
          <span class="label-dot"></span>
          Environmental Awareness Platform
        </div>
        <h1 class="hero-title animate-in animate-in-delay-1">
          Understand. Protect.<br/>
          <span class="hero-accent">Restore Australia.</span>
        </h1>
        <p class="hero-desc animate-in animate-in-delay-2">
          Explore Australia's unique climate and ecosystems, challenge your knowledge
          with eco quizzes, and join real conservation activities across the country.
        </p>
        <div class="hero-actions animate-in animate-in-delay-3">
          <button class="btn-hero-primary" @click="router.push('/quiz')">
            Take the Quiz
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="btn-hero-secondary" @click="router.push('/events')">
            Explore Activities
          </button>
        </div>
        <div class="hero-stats animate-in animate-in-delay-4">
          <div class="hero-stat">
            <span class="hero-stat-value">2.4k+</span>
            <span class="hero-stat-label">Quiz takers</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-value">180+</span>
            <span class="hero-stat-label">Activities held</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-value">12k</span>
            <span class="hero-stat-label">Trees planted</span>
          </div>
        </div>
      </div>
      <div class="hero-visual animate-in animate-in-delay-2">
        <div class="hero-card hero-card-1">
          <div class="hc-icon">🌊</div>
          <div class="hc-text">
            <strong>Reef Health</strong>
            <span>Monitoring live data</span>
          </div>
        </div>
        <div class="hero-card hero-card-2">
          <div class="hc-icon">🔥</div>
          <div class="hc-text">
            <strong>Fire Risk</strong>
            <span>Seasonal forecast</span>
          </div>
        </div>
        <div class="hero-card hero-card-3">
          <div class="hc-icon">🐨</div>
          <div class="hc-text">
            <strong>Wildlife</strong>
            <span>Conservation status</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Climate Stats Section -->
    <section class="climate-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">Climate Data</span>
          <h2 class="section-title">Australia's Climate at a Glance</h2>
          <p class="section-desc">
            Australia is one of the most climate-vulnerable developed nations on Earth.
            Rising temperatures, changing rainfall patterns, and extreme weather events
            are reshaping our landscapes and ecosystems.
          </p>
        </div>
        <div class="stats-grid">
          <div v-for="(stat, i) in climateStats" :key="i" class="stat-card">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <p class="stat-desc">{{ stat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Environmental Highlights -->
    <section class="highlights-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">Key Issues</span>
          <h2 class="section-title">Environmental Highlights</h2>
          <p class="section-desc">
            From the world's largest coral reef to devastating bushfire seasons,
            Australia faces unique environmental challenges that demand awareness and action.
          </p>
        </div>
        <div class="highlights-grid">
          <div v-for="(item, i) in highlights" :key="i" class="highlight-card">
            <div class="highlight-visual" :style="{ background: item.gradient }">
              <span class="highlight-tag">{{ item.tag }}</span>
            </div>
            <div class="highlight-body">
              <div class="highlight-location">{{ item.location }}</div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">What You Can Do</span>
          <h2 class="section-title">Learn, Act, and Earn</h2>
          <p class="section-desc">
            EcoAware gives you three powerful ways to engage with Australia's
            environment and make a measurable difference.
          </p>
        </div>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.id" class="feature-card">
            <div class="feature-icon" :style="{ color: feature.accent, background: feature.accentBg }" v-html="feature.icon"></div>
            <div class="feature-subtitle" :style="{ color: feature.accent }">{{ feature.subtitle }}</div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc">{{ feature.desc }}</p>
            <button class="feature-cta" :style="{ '--cta-color': feature.accent }" @click="router.push(feature.link)">
              {{ feature.cta }}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Upcoming Events Preview -->
    <section class="events-preview">
      <div class="section-container">
        <div class="section-header-row">
          <div>
            <span class="section-tag">Coming Up</span>
            <h2 class="section-title">Upcoming Activities</h2>
          </div>
          <router-link to="/events" class="see-all-link">
            See all activities
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </router-link>
        </div>
        <div class="events-list">
          <div v-for="(event, i) in upcomingEvents" :key="i" class="event-row">
            <div class="event-date-block">
              <span class="event-day">{{ event.date.split(' ')[1].replace(',', '') }}</span>
              <span class="event-month">{{ event.date.split(' ')[0] }}</span>
            </div>
            <div class="event-info">
              <h4>{{ event.title }}</h4>
              <div class="event-meta-row">
                <span class="event-location">{{ event.location }}</span>
                <span class="event-divider">&middot;</span>
                <span class="event-spots">{{ event.spots }} spots left</span>
              </div>
            </div>
            <div class="event-points-badge">+{{ event.points }} pts</div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-container">
        <div class="cta-bg"></div>
        <div class="cta-content">
          <h2>Ready to make a difference?</h2>
          <p>Join thousands of Australians learning about our environment and taking action to protect it. Start your eco journey today.</p>
          <div class="cta-buttons">
            <button class="btn-cta-primary" @click="router.push('/quiz')">Start Your First Quiz</button>
            <button class="btn-cta-secondary" @click="router.push('/events')">Browse Activities</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  overflow-x: hidden;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ---- Hero ---- */
.hero {
  position: relative;
  min-height: 92vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px 64px;
}

.hero-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 20% 20%, rgba(26, 86, 50, 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 40% 40% at 80% 60%, rgba(196, 101, 46, 0.04) 0%, transparent 70%),
    radial-gradient(ellipse 50% 50% at 50% 80%, rgba(15, 76, 92, 0.03) 0%, transparent 70%);
}

.hero-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image:
    radial-gradient(circle at 25% 25%, var(--color-text) 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, var(--color-text) 1px, transparent 1px);
  background-size: 48px 48px;
}

.hero-grain {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

.hero-content {
  flex: 1;
  max-width: 600px;
}

.hero-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  margin-bottom: 24px;
}

.label-dot {
  width: 8px;
  height: 8px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-text);
  margin-bottom: 24px;
  letter-spacing: -0.02em;
}

.hero-accent {
  color: var(--color-primary);
  font-style: italic;
}

.hero-desc {
  font-size: 1.1rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 36px;
  max-width: 520px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
  box-shadow: 0 4px 16px rgba(26, 86, 50, 0.25);
}

.btn-hero-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 86, 50, 0.35);
  background: var(--color-primary-dark);
}

.btn-hero-secondary {
  padding: 14px 28px;
  background: transparent;
  color: var(--color-text);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
}

.btn-hero-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-muted);
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.hero-stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.hero-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.hero-stat-divider {
  width: 1px;
  height: 36px;
  background: var(--color-border);
}

/* Hero floating cards */
.hero-visual {
  position: relative;
  width: 360px;
  height: 420px;
  flex-shrink: 0;
}

.hero-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: float 6s ease-in-out infinite;
}

.hero-card-1 {
  top: 20px;
  right: 0;
  animation-delay: 0s;
}

.hero-card-2 {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  animation-delay: -2s;
}

.hero-card-3 {
  bottom: 20px;
  right: 20px;
  animation-delay: -4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.hero-card-2 {
  animation-name: float2;
}

@keyframes float2 {
  0%, 100% { transform: translateY(-50%); }
  50% { transform: translateY(calc(-50% - 12px)); }
}

.hc-icon {
  font-size: 1.8rem;
}

.hc-text strong {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text);
}

.hc-text span {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

/* ---- Climate Section ---- */
.climate-section {
  padding: 100px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 56px;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.section-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-secondary);
  background: var(--color-secondary-muted);
  padding: 5px 14px;
  border-radius: var(--radius-full);
  margin-bottom: 16px;
}

.section-title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.section-desc {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  padding: 32px 24px;
  transition: all 0.4s var(--ease-out-expo);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-light);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: 6px;
}

.stat-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.stat-desc {
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--color-text-muted);
}

/* ---- Highlights ---- */
.highlights-section {
  padding: 40px 0 100px;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.highlight-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all 0.4s var(--ease-out-expo);
}

.highlight-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.highlight-visual {
  height: 200px;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  position: relative;
}

.highlight-tag {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  padding: 5px 12px;
  border-radius: var(--radius-full);
}

.highlight-body {
  padding: 24px;
}

.highlight-location {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.highlight-body h3 {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 10px;
}

.highlight-body p {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* ---- Features ---- */
.features-section {
  padding: 100px 0;
  background: var(--color-bg-warm);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  padding: 36px 28px;
  transition: all 0.4s var(--ease-out-expo);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.feature-subtitle {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
}

.feature-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
}

.feature-desc {
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.feature-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: transparent;
  color: var(--cta-color);
  border: 1.5px solid currentColor;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
}

.feature-cta:hover {
  background: var(--cta-color);
  color: white;
  border-color: var(--cta-color);
}

/* ---- Events Preview ---- */
.events-preview {
  padding: 100px 0;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.see-all-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  transition: gap 0.3s var(--ease-out-expo);
}

.see-all-link:hover {
  gap: 10px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  transition: all 0.3s var(--ease-out-expo);
  cursor: pointer;
}

.event-row:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.event-date-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 52px;
  padding: 10px 8px;
  background: var(--color-primary-muted);
  border-radius: var(--radius-md);
}

.event-day {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.event-month {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary);
  opacity: 0.7;
}

.event-info {
  flex: 1;
}

.event-info h4 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.event-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.event-divider {
  opacity: 0.4;
}

.event-points-badge {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-muted);
  padding: 6px 14px;
  border-radius: var(--radius-full);
}

/* ---- CTA ---- */
.cta-section {
  padding: 40px 24px 0;
}

.cta-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  padding: 80px 48px;
  text-align: center;
}

.cta-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a5632 0%, #0f4c5c 50%, #0f3d22 100%);
}

.cta-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.08;
  background-image:
    radial-gradient(circle at 30% 40%, white 1px, transparent 1px),
    radial-gradient(circle at 70% 60%, white 1px, transparent 1px);
  background-size: 40px 40px;
}

.cta-content {
  position: relative;
  z-index: 1;
  max-width: 560px;
  margin: 0 auto;
}

.cta-content h2 {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
}

.cta-content p {
  font-size: 1.05rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 36px;
}

.cta-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-cta-primary {
  padding: 14px 32px;
  background: white;
  color: var(--color-primary-dark);
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 700;
  transition: all 0.3s var(--ease-out-expo);
}

.btn-cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.btn-cta-secondary {
  padding: 14px 32px;
  background: transparent;
  color: white;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--radius-full);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s var(--ease-out-expo);
}

.btn-cta-secondary:hover {
  border-color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* ---- Responsive ---- */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .highlights-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .highlights-grid .highlight-card:last-child {
    grid-column: span 2;
  }

  .features-grid {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    min-height: auto;
    padding: 48px 16px 40px;
    text-align: center;
  }

  .hero-desc {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-visual {
    display: none;
  }

  .section-container {
    padding: 0 16px;
  }

  .climate-section,
  .highlights-section,
  .features-section,
  .events-preview {
    padding: 64px 0;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .highlights-grid {
    grid-template-columns: 1fr;
  }

  .highlights-grid .highlight-card:last-child {
    grid-column: span 1;
  }

  .section-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .cta-container {
    padding: 56px 24px;
  }

  .event-row {
    padding: 16px;
  }
}
</style>
