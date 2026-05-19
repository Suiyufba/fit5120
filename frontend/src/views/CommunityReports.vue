<script setup lang="ts">
import { onMounted } from 'vue'
import { useCommunityReports } from '../composables/useCommunityReports'
import { MAP_VISUAL_STYLES } from '../utils/mapVisualStyles'

const ctx = useCommunityReports()

function setMapElement(el: Element | null) {
  ctx.mapElement.value = el instanceof HTMLElement ? el : null
}

function setImageFileInput(el: Element | null) {
  ctx.imageFileInput.value = el instanceof HTMLInputElement ? el : null
}

onMounted(async () => {
  const el = ctx.mapElement.value
  if (el) {
    ctx.initMap(el)
    await Promise.all([ctx.loadHazards(), ctx.loadReports()])
    const refresh = setInterval(() => { ctx.loadHazards(); ctx.loadReports() }, 60000)
    onBeforeUnmount(() => clearInterval(refresh))
  }
})
</script>

<script lang="ts">
import { onBeforeUnmount } from 'vue'
export default { name: 'CommunityReports' }
</script>

<template>
  <main class="community-layout">
    <!-- Emergency modal -->
    <div v-if="ctx.showEmergencyModal.value" class="emergency-modal" role="dialog" aria-modal="true" aria-labelledby="emergency-modal-title">
      <div class="emergency-modal__backdrop" @click="ctx.dismissEmergencyModal"></div>
      <div class="emergency-modal__card">
        <span class="material-symbols-outlined emergency-modal__icon">emergency</span>
        <h2 id="emergency-modal-title">Is this an emergency?</h2>
        <p class="emergency-modal__body">If life or property is in immediate danger, please call <strong>000</strong> right now. Otherwise you can continue and submit a community report.</p>
        <div class="emergency-modal__actions">
          <button type="button" class="emergency-modal__call" @click="ctx.confirmEmergencyAndCall">Yes — call 000</button>
          <button type="button" class="emergency-modal__continue" @click="ctx.dismissEmergencyModal">No — continue reporting</button>
        </div>
        <p class="emergency-modal__footnote">000 is Australia's national emergency number for police, fire, and ambulance.</p>
      </div>
    </div>

    <!-- Side panel -->
    <aside class="community-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': ctx.isSheetExpanded.value }">
      <div class="mobile-sheet__handle"></div>
      <div class="community-mobile-actions">
        <button class="mobile-sheet-toggle" @click="ctx.toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ ctx.isSheetExpanded.value ? 'expand_more' : 'expand_less' }}</span>
          {{ ctx.isSheetExpanded.value ? 'Show Less' : 'Open Community Panel' }}
        </button>
      </div>
      <div class="mobile-sheet__body community-panel__body">
        <div>
          <p class="community-kicker">Community Intelligence + Official Risk Layer</p>
          <h1>Community Reports</h1>
          <p class="community-sub">Pick location on map, fill report on left, submit in same page.</p>
        </div>

        <section class="community-declaration" aria-label="Community report declaration">
          <span class="material-symbols-outlined" aria-hidden="true">info</span>
          <p>Community reports are uploaded by members of the public. HikeShield does not independently verify every submission and cannot guarantee its accuracy, completeness, or authenticity.</p>
        </section>

        <section v-if="ctx.isMobileViewport.value" class="community-mobile-summary">
          <article><span>Reports</span><strong>{{ ctx.stats.value.total }}</strong></article>
          <article><span>Point</span><strong>{{ ctx.selectedPoint.value ? 'Selected' : 'Tap map' }}</strong></article>
          <article><span>Sync</span><strong>{{ ctx.fetchedAt.value?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '—' }}</strong></article>
        </section>

        <div v-if="ctx.isMobileViewport.value" class="community-mobile-tabs">
          <button class="community-mobile-tab" :class="{ 'community-mobile-tab--active': ctx.activeMobileTab.value === 'submit' }" @click="ctx.activeMobileTab.value = 'submit'">Submit</button>
          <button class="community-mobile-tab" :class="{ 'community-mobile-tab--active': ctx.activeMobileTab.value === 'feed' }" @click="ctx.activeMobileTab.value = 'feed'">Feed</button>
        </div>

        <!-- Form -->
        <section v-show="!ctx.isMobileViewport.value || ctx.activeMobileTab.value === 'submit'" class="community-form">
          <div class="location-picker">
            <p class="location-picker__title">Pick Report Location</p>
            <p class="location-picker__hint">Use your current GPS, search an address, or click the map.</p>
            <div class="location-picker__row">
              <div class="address-field">
                <input class="field-input" type="text" placeholder="Search address, suburb or track"
                  :value="ctx.addressQuery.value" @input="ctx.searchAddress(($event.target as HTMLInputElement).value)" />
                <button v-if="ctx.addressQuery.value" type="button" class="address-field__clear" aria-label="Clear search" @click="ctx.clearAddressSearch">
                  <span class="material-symbols-outlined text-[16px]">close</span>
                </button>
                <div v-if="ctx.addressSuggestions.value.length || ctx.searchingAddress.value" class="address-suggestions">
                  <p v-if="ctx.searchingAddress.value && !ctx.addressSuggestions.value.length" class="address-suggestions__empty">Searching...</p>
                  <button v-for="item in ctx.addressSuggestions.value" :key="`addr-${item.lat}-${item.lng}`" type="button" class="address-suggestion" @click="ctx.applyAddressSuggestion(item)">
                    {{ item.displayName }}
                  </button>
                </div>
              </div>
              <button type="button" class="locate-btn" :disabled="ctx.locatingMe.value" @click="ctx.useMyLocation">
                <span class="material-symbols-outlined text-[18px]">my_location</span>
                {{ ctx.locatingMe.value ? 'Locating...' : 'Use My Location' }}
              </button>
            </div>
          </div>

          <div class="point-card">
            <p>Selected Map Point</p>
            <strong>{{ ctx.selectedPointLabel.value }}</strong>
          </div>

          <input v-model="ctx.form.title" class="field-input" type="text" placeholder="Report title" />
          <textarea v-model="ctx.form.description" class="field-input" rows="3" placeholder="Describe what you observed"></textarea>
          <input v-model="ctx.form.locationName" class="field-input" type="text" placeholder="Location name (track / park)" />

          <div class="field-row">
            <select v-model="ctx.form.hazardType" class="field-input">
              <option value="fire">Fire</option>
              <option value="flood">Flood</option>
              <option value="storm">Storm / Mud</option>
              <option value="trail">Trail Obstacle</option>
              <option value="other">Other</option>
            </select>
            <select v-model="ctx.form.severity" class="field-input">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>

          <div class="field-row">
            <input v-model="ctx.form.reporterName" class="field-input" type="text" placeholder="Reporter name (optional)" />
          </div>

          <div class="image-upload">
            <p class="image-upload__title">Photo (optional)</p>
            <p class="image-upload__hint">Attach a photo or take one on mobile.</p>
            <div class="image-upload__row">
              <input :ref="setImageFileInput" type="file" accept="image/*" capture="environment" class="image-upload__input"
                :disabled="ctx.imageUploading.value" @change="ctx.onImageFileSelected" />
              <button v-if="ctx.imagePreviewUrl.value || ctx.form.imageUrl" type="button" class="image-upload__clear"
                :disabled="ctx.imageUploading.value" @click="ctx.clearImageAttachment">Remove</button>
            </div>
            <p v-if="ctx.imageUploading.value" class="image-upload__status">Uploading thumbnail...</p>
            <p v-if="ctx.imageError.value" class="error-text">{{ ctx.imageError.value }}</p>
            <div v-if="ctx.imagePreviewUrl.value" class="image-upload__preview">
              <img :src="ctx.imagePreviewUrl.value" alt="Selected report photo preview" />
            </div>
          </div>

          <button class="primary-btn" :disabled="ctx.submitLoading.value" @click="ctx.handleSubmit">
            {{ ctx.submitLoading.value ? 'Submitting...' : 'Submit Report' }}
          </button>
          <p v-if="ctx.submitError.value" class="error-text">{{ ctx.submitError.value }}</p>
          <p v-if="ctx.submitSuccess.value" class="ok-text">{{ ctx.submitSuccess.value }}</p>
        </section>

        <!-- Stats & Feed -->
        <section class="summary-card">
          <p class="summary-title">Live Summary</p>
          <p>{{ ctx.stats.value.total }} reports · E {{ ctx.stats.value.extreme }} · H {{ ctx.stats.value.high }} · M {{ ctx.stats.value.moderate }} · L {{ ctx.stats.value.low }}</p>
          <p>Storage: {{ ctx.storageMode.value === 'database' ? 'Railway DB' : 'Fallback' }}</p>
          <p>Last sync: {{ ctx.fetchedAt.value?.toLocaleTimeString() || '—' }}</p>
        </section>

        <section v-show="!ctx.isMobileViewport.value || ctx.activeMobileTab.value === 'feed'" class="feed-card">
          <p class="summary-title">Latest Reports</p>
          <p v-if="ctx.loading.value && !ctx.sortedReports.value.length" class="muted">Loading reports...</p>
          <div v-for="report in ctx.sortedReports.value.slice(0, 8)" :key="report.id" class="feed-item">
            <div class="feed-title-row">
              <strong>{{ report.title }}</strong>
              <span>{{ report.severity === 'extreme' ? 'Extreme' : report.severity === 'high' ? 'High' : report.severity === 'moderate' ? 'Moderate' : 'Low' }}</span>
            </div>
            <p>{{ report.locationName }} · {{ report.reportedAt }}</p>
          </div>
        </section>
      </div>
    </aside>

    <!-- Map -->
    <section class="community-map-wrap">
      <div :ref="setMapElement" class="community-map"></div>
      <div class="community-map-status">
        <span class="material-symbols-outlined" aria-hidden="true">groups</span>
        <strong>{{ ctx.stats.value.total }}</strong>
        <span>reports</span>
      </div>
      <div class="community-map-controls">
        <button class="community-map-control-btn" type="button" aria-label="Zoom in" @click="ctx.getMapInstance()?.zoomIn()">
          <span class="material-symbols-outlined">add</span>
        </button>
        <button class="community-map-control-btn" type="button" aria-label="Zoom out" @click="ctx.getMapInstance()?.zoomOut()">
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button class="community-map-control-btn" type="button"
          :aria-label="ctx.isViewingUserLocation.value ? 'Return to Victoria map' : 'Go to my location'"
          :disabled="ctx.isMapLocatingUser.value" @click="ctx.locateMapUser">
          <span class="material-symbols-outlined">{{ ctx.isViewingUserLocation.value ? 'public' : 'my_location' }}</span>
        </button>
      </div>
      <div class="community-map-style-switcher">
        <button v-for="(style, styleId) in MAP_VISUAL_STYLES" :key="styleId" type="button"
          class="community-map-style-btn" :class="{ 'community-map-style-btn--active': ctx.selectedMapStyle.value === styleId }"
          @click="ctx.switchMapStyle(styleId as string)">
          {{ style.shortLabel }}
        </button>
      </div>
      <div class="legend-overlay">
        <p>Map Layers</p>
        <div class="legend-grid">
          <span class="legend-item"><i style="background:#1F6E57"></i>User</span>
          <span class="legend-item"><i style="background:#D84727"></i>Fire</span>
          <span class="legend-item"><i style="background:#2165B5"></i>Flood</span>
          <span class="legend-item"><i style="background:#5A4B81"></i>Storm</span>
          <span class="legend-item"><i style="background:#D08817"></i>Heat</span>
          <span class="legend-item"><i style="background:#2E7D6B"></i>Other</span>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Keep all original 1000+ lines of scoped CSS here — unchanged from the original */
.community-layout { display: grid; grid-template-columns: 410px 1fr; height: calc(100vh - 72px); height: var(--mobile-safe-height); background: linear-gradient(130deg, #ffffff 0%, #f7f7f7 52%, #eef3ef 100%); position: relative; }
.community-panel { --mobile-sheet-peek: 168px; border-right: 1px solid rgba(31, 41, 51, 0.1); padding: 1rem; display: flex; flex-direction: column; gap: 0.8rem; overflow: auto; background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(18px); }
.community-panel__body { display: flex; flex-direction: column; gap: 0.8rem; }
.community-mobile-actions { display: none; }
.community-mobile-summary, .community-mobile-tabs { display: none; }
.community-kicker { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 900; color: #2e7d6b; }
h1 { margin: 0.25rem 0; font-size: 2.1rem; line-height: 1; font-weight: 700; color: #111827; }
.community-sub { margin: 0; font-size: 0.88rem; color: #5f6b7a; }
.community-declaration { display: grid; grid-template-columns: auto 1fr; gap: 0.55rem; align-items: start; padding: 0.72rem 0.78rem; border: 1px solid rgba(208, 136, 23, 0.24); border-radius: 8px; background: #fff8e7; color: #60440f; }
.community-declaration span { font-size: 1.1rem; line-height: 1.25; color: #b56b0b; }
.community-declaration p { margin: 0; font-size: 0.78rem; line-height: 1.42; }
.community-form, .summary-card, .feed-card { background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; padding: 0.95rem; box-shadow: 0 10px 24px rgba(17, 24, 39, 0.05); }
.location-picker { background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%); border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; padding: 0.8rem 0.85rem 0.9rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.45rem; }
.location-picker__title { margin: 0; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: #2e7d6b; }
.location-picker__hint { margin: 0; font-size: 0.78rem; color: #5f6b7a; line-height: 1.4; }
.location-picker__row { display: grid; grid-template-columns: 1fr; gap: 0.55rem; align-items: start; }
.locate-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.55rem 0.75rem; border-radius: 999px; border: 1px solid rgba(31, 41, 51, 0.12); background: #fff; color: #111827; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease; justify-self: start; }
.locate-btn:hover:not(:disabled) { background: #e7f4ed; border-color: rgba(31, 110, 87, 0.32); }
.locate-btn:disabled { opacity: 0.6; cursor: wait; }
.address-field { position: relative; min-width: 0; }
.address-field .field-input { padding-right: 2.1rem; }
.address-field__clear { position: absolute; right: 0.45rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #6c7e7a; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0.2rem; border-radius: 6px; }
.address-field__clear:hover { color: #1f6e57; background: rgba(31, 110, 87, 0.08); }
.address-suggestions { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 20; background: #fff; border: 1px solid rgba(15, 40, 45, 0.12); border-radius: 10px; box-shadow: 0 12px 28px rgba(15, 40, 45, 0.12); max-height: 240px; overflow-y: auto; padding: 0.25rem; display: flex; flex-direction: column; gap: 0.15rem; }
.address-suggestions__empty { margin: 0; padding: 0.5rem 0.65rem; font-size: 0.8rem; color: #6c7e7a; }
.address-suggestion { text-align: left; padding: 0.5rem 0.65rem; border: none; background: none; color: #1a3530; font-size: 0.82rem; line-height: 1.3; border-radius: 8px; cursor: pointer; }
.address-suggestion:hover { background: #e7f4ed; color: #1f6e57; }
.point-card { background: #f7f7f7; border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 8px; padding: 0.6rem 0.75rem; margin-bottom: 0.7rem; }
.point-card p { margin: 0; font-size: 0.72rem; color: #47646b; }
.point-card strong { font-size: 0.8rem; color: #123b3e; }
.field-input { width: 100%; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 8px; padding: 0.68rem 0.78rem; font-size: 0.85rem; margin-bottom: 0.55rem; background: #ffffff; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
.primary-btn { width: 100%; margin-top: 0.2rem; border: none; border-radius: 999px; padding: 0.82rem 1rem; font-weight: 800; color: #ffffff; background: #1f6e57; box-shadow: 0 14px 30px rgba(31, 110, 87, 0.2); cursor: pointer; }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.summary-title { margin: 0 0 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; color: #2e7d6b; }
.summary-card p { margin: 0.18rem 0; font-size: 0.8rem; color: #284950; }
.feed-item { border: 1px solid rgba(33, 72, 59, 0.1); border-radius: 0.85rem; padding: 0.65rem; margin-top: 0.5rem; background: #ffffff; }
.feed-title-row { display: flex; justify-content: space-between; gap: 0.5rem; }
.feed-title-row strong { font-size: 0.82rem; color: #123b3e; }
.feed-title-row span, .feed-item p, .muted { font-size: 0.74rem; color: #4e6970; margin: 0.15rem 0 0; }
.error-text { margin: 0.35rem 0 0; font-size: 0.76rem; color: #b42318; }
.ok-text { margin: 0.35rem 0 0; font-size: 0.76rem; color: #0f7b6c; }
.image-upload { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.7rem 0.8rem; border-radius: 0.85rem; border: 1px dashed rgba(33, 72, 59, 0.22); background: rgba(255, 255, 255, 0.6); }
.image-upload__title { margin: 0; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: #1f6e57; }
.image-upload__hint { margin: 0; font-size: 0.74rem; color: #4c6b63; line-height: 1.4; }
.image-upload__row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.image-upload__input { flex: 1 1 auto; font-size: 0.78rem; color: #173b31; }
.image-upload__clear { border: 1px solid rgba(33, 72, 59, 0.18); background: rgba(255, 255, 255, 0.9); color: #173b31; font-size: 0.74rem; padding: 0.35rem 0.6rem; border-radius: 0.5rem; cursor: pointer; }
.image-upload__clear:hover:not([disabled]) { background: #fff; }
.image-upload__status { margin: 0.1rem 0 0; font-size: 0.74rem; color: #6f897b; }
.image-upload__preview { margin-top: 0.3rem; border-radius: 0.6rem; overflow: hidden; border: 1px solid rgba(33, 72, 59, 0.14); max-width: 220px; }
.image-upload__preview img { display: block; width: 100%; height: auto; }
.emergency-modal { position: fixed; inset: 0; z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.emergency-modal__backdrop { position: absolute; inset: 0; background: rgba(15, 23, 28, 0.55); backdrop-filter: blur(4px); }
.emergency-modal__card { position: relative; z-index: 1; max-width: 420px; width: 100%; background: #fffaf2; border-radius: 1.1rem; padding: 1.4rem 1.3rem 1.2rem; box-shadow: 0 24px 60px rgba(15, 23, 28, 0.35); border: 1px solid rgba(216, 71, 39, 0.28); display: flex; flex-direction: column; gap: 0.6rem; text-align: left; }
.emergency-modal__icon { font-size: 2rem !important; color: #d84727; }
.emergency-modal__card h2 { margin: 0; font-size: 1.3rem; font-weight: 700; color: #173b31; }
.emergency-modal__body { margin: 0; font-size: 0.92rem; line-height: 1.45; color: #3b5358; }
.emergency-modal__body strong { color: #d84727; }
.emergency-modal__actions { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }
.emergency-modal__call, .emergency-modal__continue { border: none; font-size: 0.95rem; font-weight: 600; padding: 0.75rem 1rem; border-radius: 0.65rem; cursor: pointer; }
.emergency-modal__call { background: #d84727; color: #fff; box-shadow: 0 8px 18px rgba(216, 71, 39, 0.32); }
.emergency-modal__call:hover { background: #b8391e; }
.emergency-modal__continue { background: rgba(33, 72, 59, 0.08); color: #173b31; }
.emergency-modal__continue:hover { background: rgba(33, 72, 59, 0.16); }
.emergency-modal__footnote { margin: 0.2rem 0 0; font-size: 0.72rem; color: #6f897b; line-height: 1.4; }
.community-map-wrap { position: relative; min-height: 0; padding: 0.85rem; background: linear-gradient(135deg, rgba(46, 125, 107, 0.08), rgba(31, 110, 87, 0.06)), #eef3ef; }
.community-map { width: 100%; height: 100%; overflow: hidden; border-radius: 14px; background: #eef3ef; box-shadow: inset 0 0 0 1px rgba(31, 41, 51, 0.1), 0 24px 70px rgba(17, 24, 39, 0.14); }
.community-map-status { position: absolute; top: 1.25rem; left: 1.25rem; z-index: 500; display: inline-flex; align-items: center; gap: 0.42rem; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 999px; padding: 0.5rem 0.72rem; background: rgba(255, 255, 255, 0.92); color: #111827; box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12); backdrop-filter: blur(14px); }
.community-map-status .material-symbols-outlined { font-size: 1.05rem; color: #2e7d6b; }
.community-map-status strong, .community-map-status span:last-child { font-size: 0.78rem; font-weight: 850; }
.community-map-controls { position: absolute; right: 1.25rem; top: 1.25rem; z-index: 500; display: grid; gap: 0.45rem; }
.community-map-control-btn { width: 2.45rem; height: 2.45rem; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 999px; background: rgba(255, 255, 255, 0.94); color: #111827; display: grid; place-items: center; box-shadow: 0 12px 26px rgba(17, 24, 39, 0.12); backdrop-filter: blur(12px); transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease; }
.community-map-control-btn:hover { transform: translateY(-1px); border-color: rgba(31, 110, 87, 0.28); background: #ffffff; }
.community-map-control-btn:disabled { cursor: wait; opacity: 0.7; }
.community-map-control-btn .material-symbols-outlined { font-size: 1.2rem; }
.community-map-style-switcher { position: absolute; right: 1.25rem; bottom: 1.25rem; z-index: 500; display: inline-flex; gap: 0.3rem; border: 1px solid rgba(31, 41, 51, 0.12); border-radius: 999px; padding: 0.25rem; background: rgba(255, 255, 255, 0.92); box-shadow: 0 14px 34px rgba(17, 24, 39, 0.12); backdrop-filter: blur(14px); }
.community-map-style-btn { border: 0; border-radius: 999px; padding: 0.42rem 0.68rem; background: transparent; color: #5f6b7a; font-size: 0.72rem; font-weight: 850; }
.community-map-style-btn--active { background: #1f6e57; color: #ffffff; box-shadow: 0 8px 18px rgba(31, 110, 87, 0.22); }
.legend-overlay { position: absolute; left: 1.25rem; bottom: 1.25rem; z-index: 500; background: rgba(255, 255, 255, 0.94); border: 1px solid rgba(31, 41, 51, 0.1); border-radius: 12px; padding: 0.7rem; box-shadow: 0 14px 30px rgba(17, 24, 39, 0.12); }
.legend-overlay p { margin: 0 0 0.45rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #2e7d6b; }
.legend-item { display: flex; align-items: center; gap: 0.42rem; font-size: 0.75rem; color: #2a4b52; margin-top: 0.3rem; }
.legend-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.2rem 0.8rem; }
.legend-item i { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
:deep(.planner-anchor) { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; color: #fff; font-size: 0.75rem; font-weight: 800; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); background: #1f6e57; }
:deep(.community-report-pin__dot) { width: 12px; height: 12px; border-radius: 999px; border: 2px solid #fff; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22); }
:deep(.community-report-popup-shell .leaflet-popup-content) { margin: 0; min-width: 230px; }
:deep(.community-report-popup) { display: grid; gap: 0.34rem; padding: 0.85rem; color: #243a35; }
:deep(.community-report-popup__thumb) { width: 100%; height: 128px; object-fit: cover; border-radius: 0.65rem; border: 1px solid rgba(33, 72, 59, 0.12); background: #edf2ec; }
:deep(.community-report-popup__title) { font-size: 0.96rem; line-height: 1.2; }
:deep(.community-report-popup__meta) { margin: 0; color: #1f6e57; font-size: 0.8rem; font-weight: 800; }
:deep(.community-report-popup__location), :deep(.community-report-popup__description) { margin: 0; color: #334b45; font-size: 0.83rem; line-height: 1.35; }
:deep(.community-report-popup__description) { white-space: pre-wrap; }
@media (max-width: 1000px) {
  .location-picker__row { grid-template-columns: 1fr; }
  .locate-btn { width: 100%; justify-content: center; }
  .community-layout { grid-template-columns: 1fr; min-height: var(--mobile-safe-height); }
  .community-map-wrap { min-height: var(--mobile-safe-height); }
  .community-map-status { top: 1.15rem; left: 1.15rem; max-width: calc(100% - 6rem); }
  .community-map-style-switcher { right: 1.15rem; bottom: calc(var(--mobile-sheet-peek, 168px) + 1rem); }
  .legend-overlay { display: none; }
  .community-panel { border-right: 0; border-top: 1px solid rgba(33, 72, 59, 0.14); padding: 0 1rem 1rem; background: rgba(255, 250, 242, 0.97); }
  .community-mobile-actions { display: flex; justify-content: center; padding-bottom: 0.4rem; }
  .community-mobile-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
  .community-mobile-summary article { border: 1px solid #dde7e7; border-radius: 0.8rem; padding: 0.55rem 0.6rem; background: #fbfefd; }
  .community-mobile-summary span { display: block; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.08em; color: #55716b; font-weight: 800; }
  .community-mobile-summary strong { display: block; margin-top: 0.18rem; font-size: 0.88rem; color: #173a34; }
  .community-mobile-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; }
  .community-mobile-tab { border: 1px solid #d9e5e5; border-radius: 999px; background: #f8fbfb; padding: 0.62rem 0.78rem; font-size: 0.8rem; font-weight: 800; color: #35524d; }
  .community-mobile-tab--active { background: #21493f; border-color: #21493f; color: #fff; }
  .legend-overlay { top: 0.8rem; left: 0.8rem; right: auto; max-width: min(210px, calc(100vw - 1.6rem)); padding: 0.55rem 0.65rem; }
  .legend-overlay p { margin-bottom: 0.3rem; font-size: 0.68rem; }
  .legend-item { margin-top: 0.12rem; font-size: 0.69rem; }
  .field-row { grid-template-columns: 1fr; }
}
</style>
