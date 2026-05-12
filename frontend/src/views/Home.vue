<script setup lang="ts">
import { useRouter } from 'vue-router'
import SiteFooter from '../components/SiteFooter.vue'
import HomeRiskPreviewMap from '../components/HomeRiskPreviewMap.vue'
import { useHome } from '../composables/useHome'

const router = useRouter()
const h = useHome()
</script>

<template>
  <div>
  <main class="home-page">
    <section class="home-hero">
      <div class="home-hero__content">
        <div class="home-hero__copy">
          <p class="home-hero__kicker">Victoria hiking safety</p>
          <h1>Find the safer trail before you leave home.</h1>
          <p>HikeShield blends live hazard feeds, route intelligence, and community reports into one calm planning surface for Victorian walkers.</p>
          <div class="home-hero__search">
            <button class="home-hero__search-main" @click="router.push('/route-planner')"><span class="material-symbols-outlined">route</span>Plan a safe route</button>
            <button class="home-hero__search-icon" aria-label="Open risk map" @click="router.push('/risk-map')"><span class="material-symbols-outlined">map</span></button>
          </div>
          <div class="home-hero__stats">
            <div><span>{{ h.previewHazards.value.length }}</span><p>active signals</p></div>
            <div><span>{{ h.topPreviewHazards.value[0]?.severity ? h.severityMeta[h.topPreviewHazards.value[0].severity]?.label : 'Clear' }}</span><p>highest category</p></div>
            <div><span>{{ h.previewUpdatedAt.value?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--' }}</span><p>last sync</p></div>
          </div>
        </div>
        <div class="home-hero__media">
          <img alt="Sunlit mountain trail in Victoria" src="https://images.pexels.com/photos/34724001/pexels-photo-34724001.jpeg?auto=compress&cs=tinysrgb&w=1600" />
          <div class="home-hero__route-card"><p>Recommended check</p><strong>Route + risk together</strong><span>Review fire, storm, heat, and trail alerts before committing.</span></div>
        </div>
      </div>
    </section>

    <section class="home-section home-risk">
      <div class="home-section__header">
        <div><p class="home-eyebrow">Live risk intelligence</p><h2>Map first. Warnings second. Guesswork never.</h2></div>
        <button class="home-link-btn" @click="router.push('/risk-map')">Open full map<span class="material-symbols-outlined">arrow_forward</span></button>
      </div>
      <div class="home-risk__grid">
        <div class="home-map-card">
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
        <div class="home-safety-stack">
          <article class="home-warning-card">
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

    <section class="home-section">
      <div class="home-section__header"><div><p class="home-eyebrow">Community intelligence</p><h2>Recent reports from the trail.</h2></div><button class="home-link-btn" @click="router.push('/community-reports')">View all reports</button></div>
      <div v-if="h.communityReportsLoading.value" class="home-state">Loading recent community alerts...</div>
      <div v-else-if="h.communityReportsError.value" class="home-state home-state--error">{{ h.communityReportsError.value }}</div>
      <div v-else-if="!h.communityAlerts.value.length" class="home-state">No community alerts submitted yet.</div>
      <div v-else class="home-alert-grid">
        <article v-for="alert in h.communityAlerts.value" :key="alert.id" class="home-alert-card">
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
        <div class="home-section__header"><div><p class="home-eyebrow">Knowledge Hub</p><h2>Read before the route gets real.</h2></div><p>Live articles from your database, surfaced on the homepage.</p></div>
        <div v-if="h.knowledgeLoading.value" class="home-state">Loading knowledge articles...</div>
        <div v-else-if="h.knowledgeError.value" class="home-state home-state--error">{{ h.knowledgeError.value }}</div>
        <div v-else-if="!h.knowledgeArticles.value.length" class="home-state">No knowledge articles published yet.</div>
        <div v-else class="home-knowledge-grid">
          <div v-for="article in h.knowledgePreviewCards.value" :key="article.id" class="home-knowledge-card">
            <img v-if="article.imageUrl" :src="article.imageUrl" :alt="article.title" class="home-knowledge-card__image" />
            <div v-else class="home-knowledge-card__image home-knowledge-card__image--empty"></div>
            <div class="home-knowledge-card__body"><span>{{ article.topic }}</span><h3>{{ article.title }}</h3><p>{{ article.summary }}</p><button @click="router.push('/knowledge-hub')">{{ h.getKnowledgeAccent(article.topic).cta }}<span class="material-symbols-outlined">arrow_forward</span></button></div>
          </div>
          <div class="home-knowledge-feature">
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
.home-page { display: grid; gap: clamp(3rem, 7vw, 5.5rem); padding-bottom: clamp(3rem, 6vw, 5rem); }
.home-hero { padding: clamp(1.4rem, 4vw, 3rem) 1rem 0; background: linear-gradient(180deg, #ffffff 0%, #ffffff 68%, #f7f7f7 100%); }
.home-hero__content { width: min(1220px, calc(100% - 2rem)); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 0.88fr) minmax(360px, 0.76fr); gap: clamp(2rem, 5vw, 4.5rem); align-items: center; }
.home-hero__copy { max-width: 44rem; }
.home-hero__kicker { display: inline-flex; align-items: center; gap: 0.55rem; margin-bottom: 1.1rem; font-size: 0.73rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #2e7d6b; }
.home-hero h1 { margin: 0; max-width: 46rem; color: #111827; font-size: clamp(3rem, 6.6vw, 6rem); line-height: 0.98; letter-spacing: 0; }
.home-hero__copy > p:not(.home-hero__kicker) { max-width: 38rem; margin-top: 1.35rem; color: #5f6b7a; font-size: clamp(1.02rem, 1.35vw, 1.18rem); line-height: 1.7; }
.home-hero__search { display: inline-flex; align-items: center; gap: 0.45rem; margin-top: 2rem; border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 999px; background: #ffffff; padding: 0.45rem; box-shadow: 0 18px 48px rgba(17, 24, 39, 0.1); }
.home-hero__search-main, .home-hero__search-icon { border: 0; cursor: pointer; }
.home-hero__search-main { display: inline-flex; align-items: center; gap: 0.55rem; border-radius: 999px; background: #ffffff; padding: 0.9rem 1.25rem; color: #111827; font-weight: 800; }
.home-hero__search-icon { display: grid; place-items: center; width: 3.1rem; height: 3.1rem; border-radius: 999px; background: #1f6e57; color: #ffffff; box-shadow: 0 14px 30px rgba(31, 110, 87, 0.24); }
.home-hero__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; max-width: 36rem; margin-top: 2rem; }
.home-hero__stats div { border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 14px; background: #ffffff; padding: 1rem; }
.home-hero__stats span { display: block; color: #111827; font-size: clamp(1.4rem, 2.6vw, 2.1rem); font-weight: 800; line-height: 1; }
.home-hero__stats p { margin-top: 0.45rem; color: #8a94a3; font-size: 0.74rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.home-hero__media { position: relative; min-height: clamp(420px, 52vw, 680px); overflow: hidden; border-radius: 28px; background: #f1f3f5; box-shadow: 0 30px 80px rgba(17, 24, 39, 0.16); }
.home-hero__media img { width: 100%; height: 100%; min-height: inherit; object-fit: cover; }
.home-hero__route-card { position: absolute; left: 1rem; right: 1rem; bottom: 1rem; border: 1px solid rgba(255,255,255,0.72); border-radius: 18px; background: rgba(255,255,255,0.88); padding: 1rem; backdrop-filter: blur(18px); box-shadow: 0 18px 50px rgba(17,24,39,0.16); }
.home-hero__route-card p, .home-hero__route-card span { color: #5f6b7a; font-size: 0.82rem; }
.home-hero__route-card p { margin: 0 0 0.25rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2e7d6b; }
.home-hero__route-card strong { display: block; color: #111827; font-size: 1.15rem; }
.home-section { width: min(1220px, calc(100% - 2rem)); margin: 0 auto; }
.home-section__header { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.4rem; }
.home-section__header h2 { max-width: 42rem; font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.04; }
.home-section__header > p, .home-section__header div + p { max-width: 28rem; color: #5f6b7a; line-height: 1.65; }
.home-eyebrow { margin-bottom: 0.5rem; color: #2e7d6b; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
.home-link-btn { display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid rgba(31,41,51,0.12); border-radius: 999px; background: #ffffff; padding: 0.72rem 1rem; color: #111827; font-weight: 800; white-space: nowrap; }
.home-risk__grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.7fr); gap: 1.2rem; }
.home-map-card, .home-warning-card, .home-signal-list, .home-alert-card, .home-knowledge-card, .home-knowledge-feature { border: 1px solid rgba(31,41,51,0.1); border-radius: 14px; background: #ffffff; box-shadow: 0 14px 36px rgba(17,24,39,0.07); }
.home-map-card { padding: 1rem; }
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
.home-warning-card { padding: 1.25rem; background: #fff4f1; border-color: #ffd1c8; }
.home-warning-card div { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.home-warning-card .material-symbols-outlined { color: #da1e28; font-size: 2.4rem; }
.home-warning-card small, .home-signal-list small { border-radius: 999px; background: #da1e28; padding: 0.26rem 0.55rem; color: #ffffff; font-size: 0.64rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.home-warning-card h3 { margin-top: 1rem; color: #5a1f12; font-size: 1.35rem; }
.home-warning-card p { margin-top: 0.45rem; color: #7e3b2a; font-size: 0.9rem; line-height: 1.55; }
.home-signal-list { overflow: hidden; }
.home-signal-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.85rem; align-items: center; padding: 1rem; border-bottom: 1px solid rgba(31,41,51,0.08); }
.home-signal-list li:last-child { border-bottom: 0; }
.home-signal-list strong { color: #111827; font-size: 0.92rem; }
.home-signal-list p { color: #8a94a3; font-size: 0.78rem; }
.home-signal-list small { background: #f1f3f5; color: #5f6b7a; }
.home-alert-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.home-alert-card { padding: 1.15rem; }
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
.home-report-btn { display: flex; align-items: center; justify-content: center; gap: 0.45rem; width: fit-content; margin: 1.25rem auto 0; border: 0; border-radius: 999px; background: #e7f4ed; padding: 0.9rem 1.3rem; color: #1f6e57; font-weight: 900; }
.home-state { border: 1px solid rgba(31,41,51,0.1); border-radius: 14px; background: #ffffff; padding: 1rem 1.15rem; color: #5f6b7a; font-size: 0.92rem; }
.home-state--error { border-color: #fecdd3; background: #fff1f2; color: #be123c; }
.home-knowledge { background: #f7f7f7; padding: clamp(3rem, 7vw, 5rem) 0; }
.home-knowledge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.home-knowledge-card, .home-knowledge-feature { overflow: hidden; }
.home-knowledge-card__image, .home-knowledge-feature__image { width: 100%; height: 180px; object-fit: cover; background: #eef3ef; }
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
}
</style>
