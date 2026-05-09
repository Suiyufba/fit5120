<script setup>
import { useRouter } from 'vue-router'
import { useRiskMap, layerMeta } from '../composables/useRiskMap'
import { MAP_VISUAL_STYLES } from '../utils/mapVisualStyles'

const router = useRouter()
const r = useRiskMap()

function openLocationDetail(hazard: any) {
  r.selectHazard(hazard)
  router.push({ name: 'location-detail', params: { id: hazard.id }, query: {
    title: hazard.title, type: hazard.type, severity: hazard.severity,
    category: hazard.type === 'other' ? 'Other' : (hazard.riskCategory || ''),
    source: hazard.source, updatedAt: hazard.updatedAt || '',
    lat: String(hazard.coordinates?.[0] ?? ''), lng: String(hazard.coordinates?.[1] ?? ''),
    description: hazard.description || '',
  }})
}
</script>

<template>
  <div class="risk-map-page">
    <aside class="risk-map-sidebar mobile-sheet" :class="{ 'mobile-sheet--expanded': r.isSheetExpanded.value }">
      <div class="mobile-sheet__handle"></div>
      <div class="risk-map-mobile-actions">
        <button class="mobile-sheet-toggle" @click="r.toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ r.isSheetExpanded.value ? 'expand_more' : 'expand_less' }}</span>
          {{ r.isSheetExpanded.value ? 'Show Less' : 'Open Feed' }}
        </button>
      </div>
      <div class="mobile-sheet__body risk-map-sidebar__body">
        <div><p class="risk-map-kicker">Real-time Victoria Risk Map</p><h1 class="risk-map-title">Official Open Data Monitoring</h1></div>
        <div class="risk-map-layers"><p class="risk-map-block-title">Hazard Layers</p>
          <div class="risk-map-layer-list">
            <div v-for="(meta, layerId) in layerMeta" :key="layerId" class="risk-map-layer-btn risk-map-layer-btn--active">
              <span class="risk-map-layer-dot" :style="{ background: meta.color }"></span><span>{{ meta.label }}</span>
            </div>
          </div>
        </div>
        <div class="risk-map-summary">
          <p class="risk-map-block-title">Current Summary</p>
          <p class="risk-map-subline">{{ r.statewideHazards.value.length }} hazards</p>
          <p class="risk-map-subline">Extreme {{ r.statewideStats.value.extreme }} · High {{ r.statewideStats.value.high }} · Moderate {{ r.statewideStats.value.moderate }} · Low {{ r.statewideStats.value.low }}</p>
          <p class="risk-map-subline">Visible on map: {{ r.filteredHazards.value.length }}</p>
          <p class="risk-map-subline">Last update: {{ r.lastUpdatedAt.value?.toLocaleTimeString() || '—' }}</p>
        </div>
        <div class="risk-map-feed"><p class="risk-map-block-title">Visible Feed</p>
          <div class="risk-map-feed-list">
            <button v-for="hazard in r.filteredHazards.value" :key="hazard.id" class="risk-map-feed-item"
              :class="{ 'risk-map-feed-item--active': r.selectedHazardId.value === hazard.id }" @click="openLocationDetail(hazard)">
              <span class="risk-map-feed-severity">{{ r.severityLabel[hazard.severity] || 'Low' }}</span>
              <strong>{{ hazard.title }}</strong>
              <small>{{ hazard.type === 'other' ? 'Other' : (hazard.riskCategory || layerMeta[hazard.type]?.label || 'Unspecified') }} · {{ hazard.source }}</small>
            </button>
          </div>
        </div>
      </div>
    </aside>
    <main class="risk-map-canvas-wrap">
      <div ref="r.mapElement.value" class="risk-map-canvas"></div>
      <div class="risk-map-map-status"><span class="material-symbols-outlined">radar</span><strong>{{ r.statewideHazards.value.length }}</strong><span>hazards</span></div>
      <div class="risk-map-map-controls">
        <button class="risk-map-control-btn" @click="r.getMapInstance()?.zoomIn()"><span class="material-symbols-outlined">add</span></button>
        <button class="risk-map-control-btn" @click="r.getMapInstance()?.zoomOut()"><span class="material-symbols-outlined">remove</span></button>
        <button class="risk-map-control-btn" :aria-label="r.isViewingUserLocation.value ? 'Return to Victoria map' : 'Go to my location'"
          :disabled="r.isLocatingUser.value" @click="r.locateUser">
          <span class="material-symbols-outlined">{{ r.isViewingUserLocation.value ? 'public' : 'my_location' }}</span>
        </button>
      </div>
      <div class="risk-map-style-switcher">
        <button v-for="(style, styleId) in MAP_VISUAL_STYLES" :key="styleId" class="risk-map-style-btn"
          :class="{ 'risk-map-style-btn--active': r.selectedMapStyle.value === styleId }" @click="r.switchMapStyle(styleId as string)">{{ style.shortLabel }}</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.risk-map-page { display: grid; grid-template-columns: minmax(360px, 390px) 1fr; height: calc(100vh - 72px); height: var(--mobile-safe-height); background: linear-gradient(140deg, #ffffff 0%, #f7f7f7 54%, #eef3ef 100%); overflow: hidden; position: relative; }
.risk-map-sidebar { --mobile-sheet-peek: 240px; padding: 1.2rem; border-right: 1px solid rgba(31, 41, 51, 0.1); background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(18px); display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; min-height: 0; }
.risk-map-sidebar__body { display: flex; flex-direction: column; gap: 0.95rem; }
.risk-map-mobile-actions { display: none; }
.risk-map-kicker { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 900; color: #2e7d6b; }
.risk-map-title { margin-top: 0.35rem; font-size: 2rem; line-height: 1; font-weight: 700; color: #111827; }
.risk-map-layers, .risk-map-summary, .risk-map-feed { background: rgba(255, 255, 255, 0.86); border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; padding: 0.95rem; box-shadow: 0 10px 28px rgba(17, 24, 39, 0.05); }
.risk-map-block-title { font-size: 0.73rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #5f6b7a; }
.risk-map-layer-list { margin-top: 0.7rem; display: grid; gap: 0.45rem; }
.risk-map-layer-btn { display: flex; align-items: center; gap: 0.55rem; border-radius: 999px; border: 1px solid rgba(31, 41, 51, 0.1); padding: 0.48rem 0.62rem; font-size: 0.8rem; color: #1f2933; background: #ffffff; }
.risk-map-layer-btn--active { border-color: rgba(31, 110, 87, 0.32); background: #e7f4ed; font-weight: 700; }
.risk-map-layer-dot { width: 0.66rem; height: 0.66rem; border-radius: 999px; }
.risk-map-subline { margin-top: 0.55rem; font-size: 0.8rem; color: #5f6b7a; }
.risk-map-feed-list { margin-top: 0.6rem; display: grid; gap: 0.55rem; max-height: 33vh; overflow: auto; padding-right: 0.2rem; }
.risk-map-feed-item { text-align: left; border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; padding: 0.72rem; background: #ffffff; display: grid; gap: 0.2rem; font-size: 0.78rem; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
.risk-map-feed-item:hover { transform: translateY(-1px); border-color: rgba(46, 125, 107, 0.28); box-shadow: 0 10px 22px rgba(17, 24, 39, 0.08); }
.risk-map-feed-item--active { border-color: rgba(31, 110, 87, 0.38); background: #fff4f6; }
.risk-map-feed-severity { font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: #2e7d6b; font-weight: 800; }
.risk-map-feed-item strong { color: #111827; }
.risk-map-feed-item small { color: #5f6c67; }
.risk-map-canvas-wrap { position: relative; overflow: hidden; height: 100%; min-height: 0; padding: 0.9rem; background: linear-gradient(135deg, rgba(46, 125, 107, 0.08), rgba(31, 110, 87, 0.06)), #eef3ef; }
.risk-map-canvas { height: 100%; width: 100%; overflow: hidden; border-radius: 14px; background: #eef3ef; box-shadow: inset 0 0 0 1px rgba(31, 41, 51, 0.1), 0 24px 70px rgba(17, 24, 39, 0.14); }
.risk-map-map-status { position: absolute; top: 1.25rem; left: 1.25rem; z-index: 500; display: inline-flex; align-items: center; gap: 0.42rem; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 999px; padding: 0.5rem 0.72rem; background: rgba(255, 255, 255, 0.92); color: #111827; box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12); backdrop-filter: blur(14px); }
.risk-map-map-status .material-symbols-outlined { font-size: 1.05rem; color: #2e7d6b; }
.risk-map-map-status strong, .risk-map-map-status span:last-child { font-size: 0.78rem; font-weight: 850; }
.risk-map-map-controls { position: absolute; right: 1.25rem; top: 1.25rem; display: grid; gap: 0.45rem; z-index: 500; }
.risk-map-control-btn { width: 2.45rem; height: 2.45rem; border-radius: 999px; border: 1px solid rgba(31, 41, 51, 0.12); background: rgba(255, 255, 255, 0.94); color: #111827; display: grid; place-items: center; box-shadow: 0 12px 26px rgba(17, 24, 39, 0.12); backdrop-filter: blur(12px); transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
.risk-map-control-btn:hover { transform: translateY(-1px); border-color: rgba(31, 110, 87, 0.28); background: #ffffff; }
.risk-map-control-btn:disabled { cursor: wait; opacity: 0.7; }
.risk-map-control-btn .material-symbols-outlined { font-size: 1.2rem; }
.risk-map-style-switcher { position: absolute; right: 1.25rem; bottom: 1.25rem; z-index: 500; display: inline-flex; gap: 0.3rem; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 999px; padding: 0.25rem; background: rgba(255, 255, 255, 0.92); box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12); backdrop-filter: blur(14px); }
.risk-map-style-btn { border: 0; border-radius: 999px; padding: 0.42rem 0.68rem; background: transparent; color: #5f6b7a; font-size: 0.72rem; font-weight: 850; }
.risk-map-style-btn--active { background: #1f6e57; color: #ffffff; box-shadow: 0 8px 18px rgba(31, 110, 87, 0.22); }
:deep(.hs-map-popup .leaflet-popup-content-wrapper) { border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 12px; background: rgba(255, 255, 255, 0.96); color: #111827; box-shadow: 0 18px 44px rgba(17, 24, 39, 0.16); backdrop-filter: blur(14px); }
:deep(.hs-map-popup .leaflet-popup-content) { margin: 0.85rem; }
:deep(.hs-map-popup .leaflet-popup-tip) { background: rgba(255, 255, 255, 0.96); }
@media (max-width: 1024px) {
  .risk-map-page { grid-template-columns: 1fr; min-height: var(--mobile-safe-height); }
  .risk-map-sidebar { border-right: none; border-top: 1px solid rgba(31, 41, 51, 0.1); padding: 0 1rem 1rem; background: rgba(255, 255, 255, 0.96); }
  .risk-map-feed-list { max-height: none; }
  .risk-map-canvas-wrap { height: 100%; min-height: var(--mobile-safe-height); }
  .risk-map-map-status { top: 1.15rem; left: 1.15rem; max-width: calc(100% - 6rem); }
  .risk-map-style-switcher { right: 1.15rem; bottom: calc(var(--mobile-sheet-peek, 240px) + 1rem); }
  .risk-map-mobile-actions { display: flex; justify-content: center; padding-bottom: 0.5rem; }
}
</style>
