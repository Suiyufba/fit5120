<script setup lang="ts">
import { useRoutePlanner, layerMeta } from '../composables/useRoutePlanner'
import PlannerMap from '../components/PlannerMap.vue'
import PlannerPointSearch from '../components/PlannerPointSearch.vue'
import PlannerActionBar from '../components/PlannerActionBar.vue'
import PlannerRouteSummary from '../components/PlannerRouteSummary.vue'
import PlannerHistoryPanel from '../components/PlannerHistoryPanel.vue'
import PlannerHazardLegend from '../components/PlannerHazardLegend.vue'

const p = useRoutePlanner()
</script>

<template>
  <main class="planner-layout">
    <aside ref="p.plannerPanel.value" class="planner-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': p.isSheetExpanded.value }">
      <div class="mobile-sheet__handle"></div>
      <div class="planner-mobile-actions">
        <button class="mobile-sheet-toggle" @click="p.toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ p.isSheetExpanded.value ? 'expand_more' : 'expand_less' }}</span>
          {{ p.isSheetExpanded.value ? 'Show Less' : 'Route Panel' }}
        </button>
      </div>
      <div ref="p.plannerPanelBody.value" class="mobile-sheet__body planner-panel__body">
        <div><p class="planner-kicker">Pre-Hike Safety Planner</p><h1>Plan Route</h1><p class="planner-sub">Click map to set start and destination. Route safety is personalized by your level.</p></div>

        <PlannerPointSearch
          :start-input="p.startInput.value" :end-input="p.endInput.value"
          :start-point="p.startPoint.value" :end-point="p.endPoint.value"
          :start-label="p.startLabel.value" :end-label="p.endLabel.value"
          :start-suggestions="p.startSuggestions.value" :end-suggestions="p.endSuggestions.value"
          @focus-input="p.handlePointInputFocus" @search-input="p.handleSearchInput"
          @select-location="({ type, location }: any) => p.applyPointSelection(type, location)" />

        <PlannerActionBar :can-plan="p.canPlan.value" :loading="p.loading.value" @plan-route="p.handlePlanRoute" @reset="p.resetSelection" />

        <p v-if="p.error.value" ref="p.plannerError.value" class="planner-error" role="alert">{{ p.error.value }}</p>

        <div ref="p.plannerSummary.value">
          <PlannerRouteSummary :route-choices="p.routeChoices.value" :selected-route-id="p.selectedRouteId.value"
            :summary="p.summary.value" @select-route="p.selectRoute" @view-details="p.goToDetails" />
        </div>

        <PlannerHistoryPanel :history-items="p.historyItems.value" :loading="p.loadingHistory.value"
          :clearing-all="p.clearingHistory.value" :deleting-id="p.deletingHistoryId.value"
          @refresh="p.loadHistory" @clear-all="p.clearAllHistory" @clear-item="p.clearHistoryItem" @select-item="p.applyHistoryPlan" />

        <PlannerHazardLegend :layers="layerMeta" />
      </div>
    </aside>

    <PlannerMap ref="p.plannerMap.value" :start-point="p.startPoint.value" :end-point="p.endPoint.value"
      :route-choices="p.routeChoices.value" :selected-route-id="p.selectedRouteId.value" @map-click="p.handleMapClick" />
  </main>
</template>

<style scoped>
.planner-layout { display: grid; grid-template-columns: minmax(370px, 410px) 1fr; height: calc(100vh - 72px); height: var(--mobile-safe-height); background: linear-gradient(130deg, #ffffff 0%, #f7f7f7 52%, #eef3ef 100%); position: relative; }
.planner-panel { --mobile-sheet-peek: 250px; border-right: 1px solid rgba(31, 41, 51, 0.1); background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(18px); padding: 1.2rem; display: flex; flex-direction: column; gap: 0.9rem; overflow: auto; position: relative; scroll-behavior: smooth; }
.planner-panel__body { display: flex; flex-direction: column; gap: 0.9rem; scroll-behavior: smooth; }
.planner-mobile-actions { display: none; }
.planner-kicker { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: #2e7d6b; font-weight: 900; }
h1 { margin-top: 0.25rem; font-size: 2rem; line-height: 1; font-weight: 700; color: #111827; }
.planner-sub { color: #5f6b7a; font-size: 0.88rem; margin-top: 0.4rem; }
.planner-error { background: #fff1ef; border: 1px solid #e9b7ae; color: #7c271f; border-radius: 0.65rem; padding: 0.58rem; font-size: 0.84rem; }
@media (max-width: 980px) {
  .planner-layout { grid-template-columns: 1fr; min-height: var(--mobile-safe-height); overflow: hidden; }
  .planner-panel { position: absolute; left: 0; right: 0; bottom: 0; border-right: 0; border-top: 1px solid rgba(31, 41, 51, 0.1); padding: 0 1rem 1rem; background: rgba(255, 255, 255, 0.96); z-index: 700; }
  .planner-mobile-actions { display: flex; justify-content: center; padding-bottom: 0.45rem; }
}
</style>
