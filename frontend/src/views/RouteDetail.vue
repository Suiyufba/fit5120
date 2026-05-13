<script setup lang="ts">
import { useRouteDetail } from '../composables/useRouteDetail'
import { useRouter } from 'vue-router'

const router = useRouter()
const ctx = useRouteDetail()

function setMapElement(el: Element | null) {
  ctx.mapElement.value = el instanceof HTMLElement ? el : null
}
</script>

<template>
  <main class="detail-layout">
    <section class="detail-map-wrap">
      <div :ref="setMapElement" class="detail-map"></div>
      <p v-if="ctx.mapInitError.value" class="map-init-error">{{ ctx.mapInitError.value }}</p>
    </section>

    <aside class="detail-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': ctx.isSheetExpanded.value }">
      <div class="mobile-sheet__handle"></div>
      <div class="detail-mobile-actions">
        <button class="mobile-sheet-toggle" @click="ctx.toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ ctx.isSheetExpanded.value ? 'expand_more' : 'expand_less' }}</span>
          {{ ctx.isSheetExpanded.value ? 'Show Less' : 'Route Detail' }}
        </button>
      </div>
      <div class="mobile-sheet__body detail-panel__body">
        <template v-if="ctx.recommended.value">
          <p class="detail-kicker">Route Safety Detail</p>
          <h1>Recommended Route</h1>
          <p v-if="ctx.planningFromShare.value" class="detail-note">Loading shared route...</p>
          <p v-if="ctx.shareMessage.value" class="detail-note detail-note--ok">{{ ctx.shareMessage.value }}</p>
          <p v-if="ctx.shareError.value" class="detail-note detail-note--error">{{ ctx.shareError.value }}</p>

          <section v-if="ctx.routeChoices.value.length > 1" class="route-picker">
            <p class="route-picker__kicker">Choose One Route</p>
            <div class="route-picker__options">
              <button v-for="option in ctx.routeChoices.value" :key="option.id" type="button"
                class="route-picker__card" :class="{ 'route-picker__card--active': ctx.recommended.value?.id === option.id }"
                @click="ctx.selectRoute(option.id)">
                <p class="route-picker__title">{{ option.optionLabel }}</p>
                <p class="route-picker__meta">{{ option.distanceKm.toFixed(1) }} km · {{ ctx.formatDuration(option.durationMin) }}</p>
                <p class="route-picker__risk">{{ option.riskLevel }}</p>
              </button>
            </div>
          </section>

          <div class="metric-grid">
            <article><span>Distance</span><strong>{{ ctx.recommended.value.distanceKm.toFixed(1) }} km</strong></article>
            <article><span>How Long It Takes</span><strong>{{ ctx.formatDuration(ctx.recommended.value.durationMin) }}</strong></article>
            <article><span>Difficulty</span><strong>{{ ctx.recommended.value.slotDifficulty || ctx.recommended.value.difficulty }}</strong></article>
            <article><span>Risk</span><strong>{{ ctx.recommended.value.riskLevel }}</strong></article>
          </div>

          <div class="status-tag" :class="{ 'status-tag--danger': ctx.recommendedIsDangerous.value }">{{ ctx.recommendedGoNoGoLabel.value }}</div>
          <p class="detail-explain">{{ ctx.recommended.value.intro || ctx.recommended.value.explanation }}</p>

          <section v-if="ctx.geography.value" class="risk-block">
            <h2>Geography Profile</h2>
            <article class="tip-item">
              Ascent {{ Math.round(ctx.geography.value.totalAscentM || 0) }} m ·
              Descent {{ Math.round(ctx.geography.value.totalDescentM || 0) }} m ·
              Max slope {{ Math.round(ctx.geography.value.maxSlopePct || 0) }}%
            </article>
          </section>

          <section class="risk-block">
            <h2>Key Risk Sections</h2>
            <article v-for="risk in ctx.recommended.value.keyRisks" :key="risk.id" class="risk-item">
              <strong>{{ risk.title }}</strong>
              <p>{{ risk.type }} · {{ risk.severity }} · {{ risk.distanceKm }} km away</p>
              <p class="risk-advice">{{ risk.advice }}</p>
              <small>Source: {{ risk.source }}</small>
            </article>
          </section>

          <section class="risk-block">
            <h2>Suggested Prep</h2>
            <article v-for="tip in ctx.prepTips.value" :key="tip" class="tip-item">{{ tip }}</article>
          </section>
        </template>

        <template v-else>
          <h1>No planned route yet</h1>
          <p class="detail-explain">Go to Plan Route and generate a safer route first.</p>
          <p v-if="ctx.shareError.value" class="detail-note detail-note--error">{{ ctx.shareError.value }}</p>
        </template>

        <button class="gmaps-btn" :disabled="!ctx.recommended.value" @click="ctx.openInGoogleMaps">
          <span class="material-symbols-outlined text-[18px]">open_in_new</span> Open in Google Maps
        </button>
        <button class="share-btn" @click="ctx.shareRoute">Share Route</button>
        <button class="back-btn" @click="router.push('/route-planner')">Back to Planner</button>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.detail-layout { display: grid; grid-template-columns: 1fr minmax(380px, 420px); height: calc(100vh - 72px); height: var(--mobile-safe-height); background: linear-gradient(130deg, #ffffff 0%, #f7f7f7 52%, #eef3ef 100%); position: relative; }
.detail-map-wrap { position: relative; padding: 0.85rem; background: #eef3ef; }
.detail-map { width: 100%; height: 100%; overflow: hidden; border-radius: 14px; box-shadow: inset 0 0 0 1px rgba(31, 41, 51, 0.08), 0 20px 60px rgba(17, 24, 39, 0.12); }
.map-init-error { position: absolute; left: 1rem; bottom: 1rem; max-width: 420px; z-index: 2; border: 1px solid #e9b2a8; color: #7d2a21; background: rgba(255, 242, 239, 0.95); padding: 0.6rem 0.75rem; border-radius: 0.55rem; font-size: 0.82rem; font-weight: 600; }
.detail-panel { --mobile-sheet-peek: 255px; border-left: 1px solid rgba(31, 41, 51, 0.1); background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(18px); padding: 1rem; overflow: auto; display: flex; flex-direction: column; gap: 0.8rem; }
.detail-panel__body { display: flex; flex-direction: column; gap: 0.8rem; }
.detail-mobile-actions { display: none; }
.detail-kicker { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.7rem; color: #2e7d6b; font-weight: 900; }
h1 { font-size: 2rem; line-height: 1; color: #111827; font-weight: 700; }
.route-picker { border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.9); padding: 0.8rem; display: grid; gap: 0.5rem; }
.route-picker__kicker { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.66rem; color: #2e7d6b; font-weight: 800; }
.route-picker__options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
.route-picker__card { border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; background: #ffffff; color: #1f2933; text-align: left; padding: 0.48rem; transition: all 0.2s ease; cursor: pointer; }
.route-picker__card--active { border-color: rgba(31, 110, 87, 0.34); background: #e7f4ed; box-shadow: 0 0 0 3px rgba(31, 110, 87, 0.12); }
.route-picker__title { font-size: 0.78rem; font-weight: 800; }
.route-picker__meta { margin-top: 0.12rem; font-size: 0.7rem; color: #456359; }
.route-picker__risk { margin-top: 0.18rem; font-size: 0.7rem; font-weight: 700; color: #33564b; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
.metric-grid article { border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; background: rgba(255, 255, 255, 0.88); padding: 0.7rem; }
.metric-grid span { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.08em; color: #5f6b7a; font-weight: 700; }
.metric-grid strong { display: block; margin-top: 0.2rem; color: #111827; }
.status-tag { width: fit-content; border-radius: 999px; padding: 0.25rem 0.6rem; background: #def6ea; color: #136844; font-weight: 800; }
.status-tag--danger { background: #ffe3e3; color: #a20f0f; border: 1px solid #ff8a8a; box-shadow: 0 0 0 2px rgba(214, 31, 31, 0.16); }
.detail-explain { color: #5f6b7a; line-height: 1.45; font-size: 0.9rem; }
.risk-block h2 { font-size: 0.92rem; color: #111827; font-weight: 800; margin-bottom: 0.45rem; }
.risk-item, .tip-item { border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; padding: 0.56rem; background: #ffffff; margin-bottom: 0.45rem; }
.risk-item strong { color: #203d35; }
.risk-item p, .risk-item small, .tip-item { color: #48635c; font-size: 0.84rem; }
.risk-advice { margin-top: 0.3rem; color: #35544b; }
.back-btn { margin-top: 0.5rem; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 999px; background: #fff; padding: 0.66rem; font-weight: 700; color: #111827; }
.share-btn { border: 0; border-radius: 999px; background: #1f6e57; color: #ffffff; padding: 0.66rem; font-weight: 700; }
.gmaps-btn { margin-top: auto; border: 1px solid #c2d5cb; border-radius: 999px; background: linear-gradient(135deg, #1a73e8 0%, #1967d2 100%); color: #fff; padding: 0.66rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; box-shadow: 0 6px 14px rgba(26, 115, 232, 0.22); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.gmaps-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(26, 115, 232, 0.28); }
.gmaps-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.detail-note { border: 1px solid #d9e4de; border-radius: 0.55rem; padding: 0.42rem 0.55rem; font-size: 0.82rem; color: #32564a; background: #f6fbf8; }
.detail-note--ok { border-color: #c6dfd3; background: #eef8f2; }
.detail-note--error { border-color: #eab8af; color: #7d2a21; background: #fff2ef; }
@media (max-width: 980px) {
  .detail-layout { grid-template-columns: 1fr; min-height: var(--mobile-safe-height); }
  .detail-panel { border-left: 0; border-top: 1px solid rgba(33, 72, 59, 0.14); padding: 0 1rem 1rem; background: rgba(255, 250, 242, 0.97); }
  .detail-mobile-actions { display: flex; justify-content: center; padding-bottom: 0.4rem; }
  .detail-map-wrap { min-height: var(--mobile-safe-height); }
  .map-init-error { right: 1rem; max-width: none; }
  .route-picker__options { grid-template-columns: 1fr; }
}
</style>

<style>
.route-pin-marker span { width: 30px; height: 30px; border-radius: 999px; border: 2px solid; display: grid; place-items: center; color: #fff; font-size: 0.85rem; font-weight: 800; box-shadow: 0 5px 14px rgba(13, 31, 24, 0.25); }
</style>
