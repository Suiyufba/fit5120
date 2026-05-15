<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated } from 'vue'
import { useRouter } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import HomeRiskPreviewMap from '../components/HomeRiskPreviewMap.vue'
import { useHome } from '../composables/useHome'

const router = useRouter()
const h = useHome()

let revealObserver: IntersectionObserver | null = null
const observedRevealEls = new WeakSet<HTMLElement>()

function markVisible(el: HTMLElement) {
  el.classList.add('is-visible')
}

function observeRevealEls() {
  const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-home-reveal]'))

  if (!revealObserver) {
    revealEls.forEach(markVisible)
    return
  }

  revealEls.forEach((el) => {
    if (observedRevealEls.has(el) || el.classList.contains('is-visible')) return
    observedRevealEls.add(el)
    revealObserver?.observe(el)
  })
}

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    observeRevealEls()
    return
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          markVisible(entry.target as HTMLElement)
          revealObserver?.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.18 }
  )

  nextTick(observeRevealEls)
})

onUpdated(() => {
  nextTick(observeRevealEls)
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
})
</script>

<template>
  <div>
  <main class="home-page">
    <section class="home-hero">
      <div class="home-hero__content">
        <div class="home-hero__copy" data-home-reveal>
          <p class="home-hero__kicker"><span></span>Victoria hiking safety</p>
          <h1 class="home-halftone-title" data-halftone="Find the safer trail before you leave home.">
            <span class="home-title-mask"><span>Find the safer trail</span></span>
            <span class="home-title-mask"><span>before you leave home.</span></span>
          </h1>
          <p class="home-hero__lede">HikeShield blends live hazard feeds, route intelligence, and community reports into one calm planning surface for Victorian walkers.</p>
          <div class="home-hero__search" data-home-reveal style="--reveal-delay: 160ms">
            <button class="home-hero__search-main" @click="router.push('/route-planner')"><span class="material-symbols-outlined">route</span>Plan a safe route</button>
            <button class="home-hero__search-icon" aria-label="Open risk map" @click="router.push('/risk-map')"><span class="material-symbols-outlined">map</span></button>
          </div>
          <div class="home-hero__stats" data-home-reveal style="--reveal-delay: 260ms">
            <div><span>{{ h.previewHazards.value.length }}</span><p>active signals</p></div>
            <div><span>{{ h.topPreviewHazards.value[0]?.severity ? h.severityMeta[h.topPreviewHazards.value[0].severity]?.label : 'Clear' }}</span><p>highest category</p></div>
            <div><span>{{ h.previewUpdatedAt.value?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--' }}</span><p>last sync</p></div>
          </div>
        </div>
        <div class="home-hero__media" data-home-reveal style="--reveal-delay: 120ms">
          <img alt="Sunlit mountain trail in Victoria" src="https://images.pexels.com/photos/34724001/pexels-photo-34724001.jpeg?auto=compress&cs=tinysrgb&w=1600" />
          <div class="home-hero__signal-card home-hero__signal-card--fire"><span></span>Fire weather watch</div>
          <div class="home-hero__signal-card home-hero__signal-card--storm"><span></span>Storm cell easing east</div>
          <div class="home-hero__route-card"><p>Recommended check</p><strong>Route + risk together</strong><span>Review fire, storm, heat, and trail alerts before committing.</span></div>
        </div>
      </div>
      <div class="home-scroll-cue" aria-hidden="true"><span></span></div>
    </section>

    <section class="home-section home-risk" data-home-reveal>
      <div class="home-section__header" data-home-reveal>
        <div><p class="home-eyebrow">Live risk intelligence</p><h2 class="home-halftone-heading" data-halftone="Map first. Warnings second. Guesswork never.">Map first. Warnings second. Guesswork never.</h2></div>
        <button class="home-link-btn" @click="router.push('/risk-map')">Open full map<span class="material-symbols-outlined">arrow_forward</span></button>
      </div>
      <div class="home-risk__grid">
        <div class="home-map-card" data-home-reveal style="--reveal-delay: 80ms">
          <div class="home-map-card__top">
            <span>{{ h.previewLoading.value ? 'Syncing live feeds' : `Updated ${h.previewUpdatedAt.value?.toLocaleTimeString() || '--'}` }}</span>
            <button @click="router.push('/risk-map')"><span class="material-symbols-outlined">open_in_full</span></button>
          </div>
          <div class="home-map-card__map">
            <HomeRiskPreviewMap :hazards="h.previewHazards.value" />
            <div class="home-map-card__feed">
              <p>Top active hazards</p>
              <div v-if="h.topPreviewHazards.value.length" class="home-map-card__hazards">
                <div v-for="hazard in h.topPreviewHazards.value" :key="hazard.id" class="home-map-card__hazard">
                  <div class="min-w-0"><strong>{{ hazard.title }}</strong><span>{{ hazard.type === 'other' ? 'Other' : hazard.type }} · {{ hazard.source }}</span></div>
                  <span class="home-severity-pill" :class="h.severityMeta[hazard.severity]?.pill || h.severityMeta.low.pill">{{ h.severityMeta[hazard.severity]?.label || 'Low' }}</span>
                </div>
              </div>
              <p v-else class="home-empty">No active hazards available right now.</p>
            </div>
          </div>
          <div class="home-risk-chips">
            <span><i style="background:#D84727"></i><em>Fire</em><strong>{{ h.previewTypeSummary.value.fire }}</strong></span>
            <span><i style="background:#2165B5"></i><em>Flood</em><strong>{{ h.previewTypeSummary.value.flood }}</strong></span>
            <span><i style="background:#5A4B81"></i><em>Storm</em><strong>{{ h.previewTypeSummary.value.storm }}</strong></span>
            <span><i style="background:#D08817"></i><em>Heat</em><strong>{{ h.previewTypeSummary.value.heat }}</strong></span>
            <span><i style="background:#6B5C4F"></i><em>Trail</em><strong>{{ h.previewTypeSummary.value.trail }}</strong></span>
            <span><i style="background:#2E7D6B"></i><em>Other</em><strong>{{ h.previewTypeSummary.value.other }}</strong></span>
          </div>
        </div>
        <div class="home-safety-stack" data-home-reveal style="--reveal-delay: 180ms">
          <article class="home-warning-card home-float-card">
            <div><span class="material-symbols-outlined" style="font-variation-settings:'FILL'1">local_fire_department</span><small>High risk</small></div>
            <h3>Bushfire readiness</h3><p>Fire Danger Ratings dominate trail access from Oct–Apr. Check VicEmergency before you head out.</p>
          </article>
          <ul class="home-signal-list">
            <li><span class="material-symbols-outlined" style="color:#2165B5">rainy</span><div><strong>Heavy rain</strong><p>Creek crossings, slippery rock</p></div><small>Moderate</small></li>
            <li><span class="material-symbols-outlined" style="color:#D08817">thermostat</span><div><strong>Heat</strong><p>Exposed ridges, hydrate early</p></div><small>Moderate</small></li>
            <li><span class="material-symbols-outlined" style="color:#6B7280">ac_unit</span><div><strong>Cold weather</strong><p>Alpine wind chill, rapid storms</p></div><small>Low</small></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="home-section" data-home-reveal>
      <div class="home-section__header" data-home-reveal><div><p class="home-eyebrow">Community intelligence</p><h2 class="home-halftone-heading" data-halftone="Recent reports from the trail.">Recent reports from the trail.</h2></div><button class="home-link-btn" @click="router.push('/community-reports')">View all reports</button></div>
      <div v-if="h.communityReportsLoading.value" class="home-state">Loading recent community alerts...</div>
      <div v-else-if="h.communityReportsError.value" class="home-state home-state--error">{{ h.communityReportsError.value }}</div>
      <div v-else-if="!h.communityAlerts.value.length" class="home-state">No community alerts submitted yet.</div>
      <div v-else class="home-alert-grid">
        <article v-for="(alert, index) in h.communityAlerts.value" :key="alert.id" class="home-alert-card" data-home-reveal :style="{ '--reveal-delay': `${index * 70}ms` }">
          <div class="home-alert-card__top"><span class="home-severity-pill" :class="h.severityMeta[alert.severity]?.pill || h.severityMeta.low.pill">{{ h.severityMeta[alert.severity]?.label || 'Low' }}</span><span>{{ alert.timeAgo }}</span></div>
          <h3>{{ alert.title }}</h3><p>{{ alert.details }}</p>
          <div class="home-alert-card__meta"><strong>{{ alert.location }}</strong><span>{{ alert.status }}</span></div>
          <div class="home-alert-card__footer"><span><span class="material-symbols-outlined">chat</span>{{ alert.replies }} updates</span><button @click="router.push('/community-reports')">Open Thread</button></div>
        </article>
      </div>
      <button class="home-report-btn" @click="router.push('/report-hazard')"><span class="material-symbols-outlined">add_circle</span> Report a Hazard</button>
    </section>

    <section class="home-knowledge">
      <div class="home-section">
        <div class="home-section__header" data-home-reveal><div><p class="home-eyebrow">Knowledge Hub</p><h2 class="home-halftone-heading" data-halftone="Read before the route gets real.">Read before the route gets real.</h2></div><p>Live articles from your database, surfaced on the homepage.</p></div>
        <div v-if="h.knowledgeLoading.value" class="home-state">Loading knowledge articles...</div>
        <div v-else-if="h.knowledgeError.value" class="home-state home-state--error">{{ h.knowledgeError.value }}</div>
        <div v-else-if="!h.knowledgeArticles.value.length" class="home-state">No knowledge articles published yet.</div>
        <div v-else class="home-knowledge-grid">
          <div v-for="(article, index) in h.knowledgePreviewCards.value" :key="article.id" class="home-knowledge-card" data-home-reveal :style="{ '--reveal-delay': `${index * 80}ms` }">
            <img v-if="article.imageUrl" :src="article.imageUrl" :alt="article.title" class="home-knowledge-card__image" />
            <div v-else class="home-knowledge-card__image home-knowledge-card__image--empty"></div>
            <div class="home-knowledge-card__body"><span>{{ article.topic }}</span><h3>{{ article.title }}</h3><p>{{ article.summary }}</p><button @click="router.push('/knowledge-hub')">{{ h.getKnowledgeAccent(article.topic).cta }}<span class="material-symbols-outlined">arrow_forward</span></button></div>
          </div>
          <div class="home-knowledge-feature" data-home-reveal style="--reveal-delay: 240ms">
            <img v-if="h.heroKnowledgeArticle.value?.imageUrl" class="home-knowledge-feature__image" :alt="h.heroKnowledgeArticle.value?.title" :src="h.heroKnowledgeArticle.value.imageUrl" />
            <div v-else class="home-knowledge-feature__image home-knowledge-card__image--empty"></div>
            <div class="home-knowledge-feature__body"><p>{{ h.heroKnowledgeArticle.value?.topic || 'Featured Article' }}</p><h3>{{ h.heroKnowledgeArticle.value?.title || 'Database spotlight' }}</h3><span>{{ h.heroKnowledgeArticle.value?.summary || 'Homepage hero now points to a real article from your Knowledge Hub.' }}</span><button @click="router.push('/knowledge-hub')">Read Stories</button></div>
          </div>
        </div>
      </div>
    </section>
  </main>
  <SiteFooter />
  </div>
</template>

<style scoped>
.home-page { display: grid; gap: clamp(3rem, 7vw, 5.5rem); padding-bottom: clamp(3rem, 6vw, 5rem); overflow: hidden; }
[data-home-reveal] {
  --reveal-delay: 0ms;
  opacity: 0;
  transform: translateY(28px) scale(0.985);
  filter: blur(10px);
  transition:
    opacity 0.72s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay),
    transform 0.72s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay),
    filter 0.72s cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay);
}
[data-home-reveal].is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}
.home-hero {
  position: relative;
  overflow: hidden;
  padding: clamp(1.4rem, 4vw, 3rem) 1rem 0;
  background:
    radial-gradient(circle at 10% 24%, rgba(232, 149, 63, 0.11), transparent 26rem),
    linear-gradient(180deg, #ffffff 0%, #ffffff 68%, #f7f7f7 100%);
  isolation: isolate;
}
.home-hero::before,
.home-hero::after {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
}
.home-hero::before {
  width: clamp(18rem, 34vw, 32rem);
  aspect-ratio: 1;
  left: max(-10rem, -8vw);
  top: clamp(2rem, 6vw, 5rem);
  background-image: radial-gradient(circle, rgba(31, 110, 87, 0.24) 0 1.4px, transparent 1.55px);
  background-size: 13px 13px;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle, #000 0 60%, transparent 72%);
  mask-image: radial-gradient(circle, #000 0 60%, transparent 72%);
  opacity: 0.2;
}
.home-hero::after {
  width: clamp(15rem, 28vw, 27rem);
  aspect-ratio: 1;
  right: clamp(-11rem, -9vw, -4rem);
  bottom: clamp(2rem, 8vw, 6rem);
  background-image: radial-gradient(circle, rgba(208, 136, 23, 0.3) 0 1.8px, transparent 2px);
  background-size: 16px 16px;
  border-radius: 999px;
  -webkit-mask-image: linear-gradient(110deg, transparent 0 12%, #000 35% 74%, transparent 100%);
  mask-image: linear-gradient(110deg, transparent 0 12%, #000 35% 74%, transparent 100%);
  opacity: 0.18;
  transform: rotate(-8deg);
}
.home-hero__content { position: relative; z-index: 1; width: min(1220px, calc(100% - 2rem)); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 0.88fr) minmax(360px, 0.76fr); gap: clamp(2rem, 5vw, 4.5rem); align-items: center; }
.home-hero__copy { position: relative; max-width: 44rem; }
.home-hero__copy::before {
  content: "";
  position: absolute;
  z-index: -1;
  width: 9.5rem;
  height: 5.5rem;
  right: clamp(1rem, 10vw, 7rem);
  top: -1.1rem;
  background-image: radial-gradient(circle, rgba(31, 41, 51, 0.16) 0 1.1px, transparent 1.25px);
  background-size: 10px 10px;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 18% 80%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 18% 80%, transparent 100%);
  opacity: 0.16;
}
.home-hero__kicker { display: inline-flex; align-items: center; gap: 0.55rem; margin-bottom: 1.1rem; font-size: 0.73rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #2e7d6b; }
.home-hero__kicker span {
  width: 1.8rem;
  height: 1px;
  background: currentColor;
  transform-origin: left center;
  animation: home-rule-draw 0.9s cubic-bezier(0.65, 0, 0.35, 1) both 0.16s;
}
.home-hero h1 { margin: 0; max-width: 46rem; color: #111827; font-size: clamp(3rem, 6.6vw, 6rem); line-height: 0.98; letter-spacing: 0; }
.home-halftone-title,
.home-halftone-heading {
  position: relative;
  display: inline-block;
  color: #111827;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}
.home-title-mask {
  display: block;
  overflow: hidden;
}
.home-title-mask > span {
  display: block;
  transform-origin: left bottom;
  animation: home-title-flip 0.92s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.home-title-mask:nth-child(2) > span {
  animation-delay: 0.12s;
}
.home-halftone-title::after,
.home-halftone-heading::after {
  content: attr(data-halftone);
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: transparent;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.74) 0 0.92px, transparent 1.08px),
    radial-gradient(circle, rgba(31, 110, 87, 0.16) 0 0.56px, transparent 0.7px);
  background-position: 0 0, 4px 5px;
  background-size: 8px 8px, 12px 12px;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 0.58;
}
.home-halftone-title::before,
.home-halftone-heading::before {
  content: attr(data-halftone);
  position: absolute;
  inset: 0;
  z-index: -1;
  color: transparent;
  background:
    linear-gradient(120deg, rgba(31, 110, 87, 0.14), rgba(208, 136, 23, 0.1) 56%, transparent 78%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  transform: translate(0.025em, 0.035em);
}
.home-halftone-heading::after {
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.68) 0 0.78px, transparent 0.94px),
    radial-gradient(circle, rgba(31, 110, 87, 0.14) 0 0.5px, transparent 0.66px);
  background-size: 7px 7px, 11px 11px;
  opacity: 0.5;
}
.home-hero__lede { max-width: 38rem; margin-top: 1.35rem; color: #5f6b7a; font-size: clamp(1.02rem, 1.35vw, 1.18rem); line-height: 1.7; }
.home-hero__search { display: inline-flex; align-items: center; gap: 0.45rem; margin-top: 2rem; border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 999px; background: #ffffff; padding: 0.45rem; box-shadow: 0 18px 48px rgba(17, 24, 39, 0.1); }
.home-hero__search-main, .home-hero__search-icon { border: 0; cursor: pointer; }
.home-hero__search-main { display: inline-flex; align-items: center; gap: 0.55rem; border-radius: 999px; background: #ffffff; padding: 0.9rem 1.25rem; color: #111827; font-weight: 800; transition: transform 0.2s ease, background 0.2s ease; }
.home-hero__search-main:hover { background: #f5fbf7; transform: translateY(-2px); }
.home-hero__search-icon { display: grid; place-items: center; width: 3.1rem; height: 3.1rem; border-radius: 999px; background: #1f6e57; color: #ffffff; box-shadow: 0 14px 30px rgba(31, 110, 87, 0.24); transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.24s ease; }
.home-hero__search-icon:hover { transform: translateY(-2px) rotate(-5deg) scale(1.04); box-shadow: 0 18px 38px rgba(31, 110, 87, 0.3); }
.home-hero__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; max-width: 36rem; margin-top: 2rem; }
.home-hero__stats div {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0, rgba(31, 110, 87, 0.12), transparent 4.8rem),
    #ffffff;
  padding: 1rem;
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease;
}
.home-hero__stats div::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 0 40%, rgba(255,255,255,0.62) 50%, transparent 62% 100%);
  transform: translateX(-130%);
  transition: transform 0.65s ease;
}
.home-hero__stats div:hover { transform: translateY(-4px); box-shadow: 0 16px 34px rgba(17, 24, 39, 0.09); }
.home-hero__stats div:hover::after { transform: translateX(130%); }
.home-hero__stats span { display: block; color: #111827; font-size: clamp(1.4rem, 2.6vw, 2.1rem); font-weight: 800; line-height: 1; }
.home-hero__stats p { margin-top: 0.45rem; color: #8a94a3; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.home-hero__media { position: relative; min-height: clamp(420px, 52vw, 680px); overflow: hidden; border-radius: 28px; background: #f1f3f5; box-shadow: 0 30px 80px rgba(17, 24, 39, 0.16); transform-origin: center bottom; }
.home-hero__media::before,
.home-hero__media::after {
  content: "";
  position: absolute;
  pointer-events: none;
}
.home-hero__media::before {
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle, rgba(255,255,255,0.34) 0 1.2px, transparent 1.35px),
    linear-gradient(120deg, rgba(17,24,39,0) 42%, rgba(17,24,39,0.18) 100%);
  background-size: 12px 12px, auto;
  mix-blend-mode: soft-light;
  opacity: 0.78;
}
.home-hero__media::after {
  z-index: 2;
  width: 44%;
  aspect-ratio: 1;
  right: -13%;
  top: 7%;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.72) 0 1.7px, transparent 1.9px);
  background-size: 14px 14px;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle, #000 0 48%, transparent 70%);
  mask-image: radial-gradient(circle, #000 0 48%, transparent 70%);
  opacity: 0.36;
}
.home-hero__media img { width: 100%; height: 100%; min-height: inherit; object-fit: cover; animation: home-ken-burns 18s ease-in-out infinite alternate; }
.home-hero__signal-card {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid rgba(255,255,255,0.78);
  border-radius: 999px;
  background: rgba(255,255,255,0.84);
  padding: 0.55rem 0.78rem;
  color: #29333f;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 38px rgba(17, 24, 39, 0.14);
  animation: home-sprinkle-bob 6.4s ease-in-out infinite;
}
.home-hero__signal-card span {
  width: 0.55rem;
  aspect-ratio: 1;
  border-radius: 999px;
  background: #d84727;
  box-shadow: 0 0 0 0 rgba(216, 71, 39, 0.35);
  animation: home-pulse-dot 1.8s ease-out infinite;
}
.home-hero__signal-card--fire { left: 1.1rem; top: 1.1rem; }
.home-hero__signal-card--storm { right: 1.1rem; top: 22%; animation-delay: -2.4s; }
.home-hero__signal-card--storm span { background: #2165b5; box-shadow: 0 0 0 0 rgba(33, 101, 181, 0.35); }
.home-hero__route-card { position: absolute; z-index: 3; left: 1rem; right: 1rem; bottom: 1rem; border: 1px solid rgba(255,255,255,0.72); border-radius: 18px; background: rgba(255,255,255,0.88); padding: 1rem; backdrop-filter: blur(18px); box-shadow: 0 18px 50px rgba(17,24,39,0.16); animation: home-card-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both 0.46s; }
.home-hero__route-card p, .home-hero__route-card span { color: #5f6b7a; font-size: 0.82rem; }
.home-hero__route-card p { margin: 0 0 0.25rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2e7d6b; }
.home-hero__route-card strong { display: block; color: #111827; font-size: 1.15rem; }
.home-scroll-cue {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 1.4rem;
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 999px;
  background: rgba(255,255,255,0.78);
  box-shadow: 0 14px 32px rgba(17, 24, 39, 0.1);
  transform: translateX(-50%);
  animation: home-scroll-bob 2.2s ease-in-out infinite;
}
.home-scroll-cue span {
  width: 0.42rem;
  height: 0.42rem;
  border-right: 2px solid #1f6e57;
  border-bottom: 2px solid #1f6e57;
  transform: translateY(-2px) rotate(45deg);
}
.home-section { width: min(1220px, calc(100% - 2rem)); margin: 0 auto; }
.home-risk { position: relative; }
.home-risk::before {
  content: "";
  position: absolute;
  z-index: -1;
  width: min(22rem, 42vw);
  aspect-ratio: 1;
  left: -8rem;
  top: 4rem;
  background-image: radial-gradient(circle, rgba(90, 75, 129, 0.16) 0 1.35px, transparent 1.55px);
  background-size: 12px 12px;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle, #000 0 48%, transparent 73%);
  mask-image: radial-gradient(circle, #000 0 48%, transparent 73%);
  opacity: 0.24;
}
.home-section__header { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.4rem; }
.home-section__header h2 { max-width: 42rem; font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.04; }
.home-section__header > p, .home-section__header div + p { max-width: 28rem; color: #5f6b7a; line-height: 1.65; }
.home-eyebrow { margin-bottom: 0.5rem; color: #2e7d6b; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
.home-link-btn { display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid rgba(31,41,51,0.12); border-radius: 999px; background: #ffffff; padding: 0.72rem 1rem; color: #111827; font-weight: 800; white-space: nowrap; transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease; }
.home-link-btn .material-symbols-outlined { transition: transform 0.22s ease; }
.home-link-btn:hover { transform: translateY(-2px); background: #f5fbf7; border-color: rgba(31, 110, 87, 0.2); }
.home-link-btn:hover .material-symbols-outlined { transform: translateX(4px); }
.home-risk__grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.7fr); gap: 1.2rem; }
.home-map-card, .home-warning-card, .home-signal-list, .home-alert-card, .home-knowledge-card, .home-knowledge-feature { border: 1px solid rgba(31,41,51,0.1); border-radius: 14px; background: #ffffff; box-shadow: 0 14px 36px rgba(17,24,39,0.07); transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease, border-color 0.24s ease; }
.home-map-card:hover, .home-warning-card:hover, .home-alert-card:hover, .home-knowledge-card:hover, .home-knowledge-feature:hover {
  transform: translateY(-5px);
  border-color: rgba(31, 110, 87, 0.18);
  box-shadow: 0 22px 54px rgba(17,24,39,0.1);
}
.home-map-card { position: relative; overflow: hidden; padding: 1rem; }
.home-map-card::before {
  content: "";
  position: absolute;
  right: -3rem;
  top: -3rem;
  width: 11rem;
  aspect-ratio: 1;
  background-image: radial-gradient(circle, rgba(31, 110, 87, 0.18) 0 1.15px, transparent 1.35px);
  background-size: 10px 10px;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle, #000 0 55%, transparent 73%);
  mask-image: radial-gradient(circle, #000 0 55%, transparent 73%);
  pointer-events: none;
}
.home-map-card__top { display: flex; align-items: center; justify-content: space-between; padding: 0 0.2rem 0.8rem; color: #8a94a3; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.home-map-card__top button { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; border: 1px solid rgba(31,41,51,0.1); border-radius: 999px; background: #ffffff; color: #1f6e57; }
.home-map-card__map { position: relative; height: clamp(360px, 44vw, 500px); overflow: hidden; border-radius: 12px; background: #eef3ef; }
.home-map-card__feed { position: absolute; inset-inline: 1rem; bottom: 1rem; border: 1px solid rgba(255,255,255,0.72); border-radius: 12px; background: rgba(255,255,255,0.92); padding: 0.85rem; backdrop-filter: blur(18px); box-shadow: 0 14px 34px rgba(17,24,39,0.12); }
.home-map-card__feed > p { margin: 0 0 0.65rem; color: #2e7d6b; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.home-map-card__hazards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; }
.home-map-card__hazard { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.75rem; align-items: start; border: 1px solid rgba(31,41,51,0.08); border-radius: 10px; padding: 0.65rem; background: #ffffff; }
.home-map-card__hazard strong { display: block; overflow: hidden; color: #111827; font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap; }
.home-map-card__hazard span { display: block; margin-top: 0.2rem; color: #8a94a3; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.home-severity-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.28rem 0.52rem; font-size: 0.64rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
.home-empty { color: #5f6b7a; font-size: 0.82rem; }
.home-risk-chips { display: flex; flex-wrap: wrap; gap: 0.35rem 0.85rem; margin-top: 0.9rem; overflow-x: auto; padding-bottom: 0.1rem; }
.home-risk-chips span { display: inline-flex; align-items: baseline; gap: 0.36rem; min-height: 1.6rem; padding-right: 0.85rem; border-right: 1px solid rgba(31,41,51,0.12); color: #5f6b7a; font-size: 0.78rem; white-space: nowrap; }
.home-risk-chips span:last-child { border-right: 0; padding-right: 0; }
.home-risk-chips i { align-self: center; width: 0.48rem; height: 0.48rem; border-radius: 999px; }
.home-risk-chips em { font-style: normal; font-weight: 700; }
.home-risk-chips strong { color: #29333f; font-weight: 850; }
.home-safety-stack { display: grid; gap: 1rem; align-content: start; }
.home-float-card { animation: home-soft-float 5.6s ease-in-out infinite; }
.home-warning-card {
  position: relative;
  overflow: hidden;
  padding: 1.25rem;
  background:
    radial-gradient(circle at 105% -5%, rgba(216, 71, 39, 0.12), transparent 8rem),
    #fff4f1;
  border-color: #ffd1c8;
}
.home-warning-card::after {
  content: "";
  position: absolute;
  right: -2.5rem;
  bottom: -2.5rem;
  width: 8rem;
  aspect-ratio: 1;
  background-image: radial-gradient(circle, rgba(216, 71, 39, 0.2) 0 1.1px, transparent 1.3px);
  background-size: 9px 9px;
  border-radius: 999px;
  pointer-events: none;
}
.home-warning-card div { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.home-warning-card .material-symbols-outlined { color: #da1e28; font-size: 2.4rem; }
.home-warning-card small, .home-signal-list small { border-radius: 999px; background: #da1e28; padding: 0.26rem 0.55rem; color: #ffffff; font-size: 0.64rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.home-warning-card h3 { margin-top: 1rem; color: #5a1f12; font-size: 1.35rem; }
.home-warning-card p { margin-top: 0.45rem; color: #7e3b2a; font-size: 0.9rem; line-height: 1.55; }
.home-signal-list { overflow: hidden; }
.home-signal-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.85rem; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(31,41,51,0.08); transition: background 0.2s ease, transform 0.2s ease; }
.home-signal-list li:hover { background: #f8fbf9; transform: translateX(4px); }
.home-signal-list li:last-child { border-bottom: 0; }
.home-signal-list strong { color: #111827; font-size: 0.92rem; }
.home-signal-list p { color: #8a94a3; font-size: 0.78rem; }
.home-signal-list small { background: #f1f3f5; color: #5f6b7a; }
.home-alert-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.home-alert-card { padding: 1.15rem; overflow: hidden; }
.home-alert-card::before,
.home-knowledge-card::before,
.home-knowledge-feature::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0 35%, rgba(255,255,255,0.72) 48%, transparent 64% 100%);
  transform: translateX(-135%);
  transition: transform 0.7s ease;
  pointer-events: none;
}
.home-alert-card,
.home-knowledge-card,
.home-knowledge-feature {
  position: relative;
}
.home-alert-card:hover::before,
.home-knowledge-card:hover::before,
.home-knowledge-feature:hover::before {
  transform: translateX(135%);
}
.home-alert-card__top, .home-alert-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.home-alert-card__top > span:last-child { color: #8a94a3; font-size: 0.72rem; font-weight: 700; }
.home-alert-card h3 { margin-top: 1rem; color: #111827; font-size: 1.02rem; }
.home-alert-card > p { margin-top: 0.55rem; color: #5f6b7a; font-size: 0.88rem; line-height: 1.55; }
.home-alert-card__meta { display: grid; gap: 0.2rem; margin-top: 1rem; }
.home-alert-card__meta strong { color: #1f2933; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
.home-alert-card__meta span { color: #8a94a3; font-size: 0.78rem; }
.home-alert-card__footer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(31,41,51,0.08); color: #8a94a3; font-size: 0.78rem; }
.home-alert-card__footer span { display: inline-flex; align-items: center; gap: 0.28rem; }
.home-alert-card__footer .material-symbols-outlined { font-size: 1rem; }
.home-alert-card__footer button, .home-knowledge-card button, .home-knowledge-feature button { border: 0; background: transparent; color: #1f6e57; font-weight: 800; }
.home-report-btn { display: flex; align-items: center; justify-content: center; gap: 0.45rem; width: fit-content; margin: 1.25rem auto 0; border: 0; border-radius: 999px; background: #e7f4ed; padding: 0.9rem 1.3rem; color: #1f6e57; font-weight: 900; transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease; }
.home-report-btn:hover { background: #d9eee3; transform: translateY(-2px) scale(1.02); }
.home-state { border: 1px solid rgba(31,41,51,0.1); border-radius: 14px; background: #ffffff; padding: 1rem 1.15rem; color: #5f6b7a; font-size: 0.92rem; }
.home-state--error { border-color: #fecdd3; background: #fff1f2; color: #be123c; }
.home-knowledge {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 10%, rgba(143, 174, 131, 0.18), transparent 22rem),
    #f7f7f7;
  padding: clamp(3rem, 7vw, 5rem) 0;
  isolation: isolate;
}
.home-knowledge > .home-section {
  position: relative;
  z-index: 1;
}
.home-knowledge::before,
.home-knowledge::after {
  content: "";
  position: absolute;
  pointer-events: none;
}
.home-knowledge::before {
  width: clamp(17rem, 32vw, 29rem);
  aspect-ratio: 1;
  right: -8rem;
  top: 2rem;
  background-image: radial-gradient(circle, rgba(31, 110, 87, 0.19) 0 1.4px, transparent 1.6px);
  background-size: 13px 13px;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle, #000 0 55%, transparent 76%);
  mask-image: radial-gradient(circle, #000 0 55%, transparent 76%);
  opacity: 0.24;
}
.home-knowledge::after {
  width: clamp(12rem, 26vw, 22rem);
  aspect-ratio: 1;
  left: -7rem;
  bottom: -5rem;
  background-image: radial-gradient(circle, rgba(208, 136, 23, 0.22) 0 1.45px, transparent 1.65px);
  background-size: 14px 14px;
  border-radius: 999px;
  -webkit-mask-image: radial-gradient(circle, #000 0 50%, transparent 74%);
  mask-image: radial-gradient(circle, #000 0 50%, transparent 74%);
  opacity: 0.22;
}
.home-knowledge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.home-knowledge-card, .home-knowledge-feature { overflow: hidden; }
.home-knowledge-card__image, .home-knowledge-feature__image { width: 100%; height: 180px; object-fit: cover; background: #eef3ef; }
.home-knowledge-card__image,
.home-knowledge-feature__image {
  transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), filter 0.8s ease;
}
.home-knowledge-card:hover .home-knowledge-card__image,
.home-knowledge-feature:hover .home-knowledge-feature__image {
  transform: scale(1.06);
  filter: saturate(1.08) contrast(1.03);
}
.home-knowledge-card__image--empty { background: linear-gradient(135deg, rgba(31,110,87,0.14), rgba(46,125,107,0.14)), #eef3ef; }
.home-knowledge-card__body, .home-knowledge-feature__body { padding: 1.1rem; }
.home-knowledge-card__body span, .home-knowledge-feature__body p { color: #2e7d6b; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.home-knowledge-card h3, .home-knowledge-feature h3 { margin-top: 0.55rem; color: #111827; font-size: 1.12rem; }
.home-knowledge-card p, .home-knowledge-feature span { display: block; margin-top: 0.55rem; color: #5f6b7a; font-size: 0.9rem; line-height: 1.55; }
.home-knowledge-card button, .home-knowledge-feature button { display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 1rem; }
.home-knowledge-feature { min-height: 100%; }
.home-knowledge-feature__image { height: 180px; }
.home-knowledge-feature__body { min-height: 0; }
.home-knowledge-feature button { width: auto; border-radius: 0; background: transparent; padding: 0; color: #1f6e57; }
@media (max-width: 900px) {
  .home-hero__content { grid-template-columns: 1fr; }
  .home-risk__grid, .home-alert-grid, .home-knowledge-grid { grid-template-columns: 1fr; }
  .home-section__header { align-items: start; flex-direction: column; }
}
@media (max-width: 640px) {
  .home-hero { padding-inline: 0; }
  .home-hero__content { width: min(100% - 1.5rem, 1220px); }
  .home-hero h1 { font-size: clamp(2.75rem, 15vw, 4.2rem); }
  .home-hero__search { width: 100%; justify-content: space-between; }
  .home-hero__stats { grid-template-columns: 1fr; }
  .home-map-card__hazards { grid-template-columns: 1fr; }
  .home-map-card__feed { position: static; margin-top: 0.75rem; }
  .home-map-card__map { height: 300px; }
  .home-scroll-cue { display: none; }
  .home-hero__signal-card { font-size: 0.66rem; }
}
@media (prefers-reduced-motion: reduce) {
  [data-home-reveal],
  [data-home-reveal].is-visible,
  .home-title-mask > span,
  .home-hero__media img,
  .home-hero__signal-card,
  .home-float-card,
  .home-scroll-cue,
  .home-hero__route-card {
    opacity: 1;
    transform: none;
    filter: none;
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
@keyframes home-title-flip {
  from {
    opacity: 0;
    transform: translateY(112%) rotateX(-72deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0deg);
  }
}
@keyframes home-rule-draw {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes home-ken-burns {
  from { transform: scale(1.02) translate3d(-1.2%, -0.8%, 0); }
  to { transform: scale(1.12) translate3d(1.6%, 1.2%, 0); }
}
@keyframes home-card-rise {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes home-sprinkle-bob {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(10deg); }
  50% { transform: translate3d(0, -14px, 0) rotate(-5deg); }
}
@keyframes home-soft-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes home-scroll-bob {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(9px); }
}
@keyframes home-pulse-dot {
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.96; }
  70% { box-shadow: 0 0 0 8px transparent; opacity: 1; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 0.96; }
}
</style>
