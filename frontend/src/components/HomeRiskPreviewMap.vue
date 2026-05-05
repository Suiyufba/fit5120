<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  applyVictoriaMapConstraints,
  clampBoundsToVictoria,
  isLatLngInVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'
import {
  createLeafletBaseLayer,
  DEFAULT_MAP_VISUAL_STYLE,
  MAP_VISUAL_STYLES,
} from '../utils/mapVisualStyles'

const props = defineProps({
  hazards: {
    type: Array,
    default: () => [],
  },
})

const mapElement = ref(null)
const selectedMapStyle = ref(DEFAULT_MAP_VISUAL_STYLE)
const isLocatingUser = ref(false)
const isViewingUserLocation = ref(false)
const severityOrder = { extreme: 4, high: 3, moderate: 2, low: 1 }
const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }
const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

let mapInstance
let baseTileLayer
let markersLayer
let userLocationLayer
let hasFittedOnce = false

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cleanPopupDescription(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?strong>/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function formatUpdatedTime(value) {
  const ts = Date.parse(value || '')
  if (Number.isNaN(ts)) return 'Time unknown'
  return new Date(ts).toLocaleString()
}

function markerRadius(severity) {
  if (severity === 'extreme') return 11
  if (severity === 'high') return 9
  if (severity === 'moderate') return 7
  return 6
}

function zoneOpacitiesBySeverity(severity) {
  if (severity === 'extreme') return { l1: 0.28, l2: 0.18, l3: 0.1 }
  if (severity === 'high') return { l1: 0.23, l2: 0.14, l3: 0.08 }
  if (severity === 'moderate') return { l1: 0.18, l2: 0.11, l3: 0.06 }
  return { l1: 0.14, l2: 0.09, l3: 0.05 }
}

function resolveHazardVisual(hazard) {
  return layerMeta[hazard?.type] || layerMeta.other
}

function drawHazards() {
  if (!markersLayer) return
  markersLayer.clearLayers()

  const points = [...props.hazards]
    .filter((hazard) => Array.isArray(hazard.coordinates) && hazard.coordinates.length === 2)
    .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))

  points.forEach((hazard) => {
    const meta = resolveHazardVisual(hazard)
    const opacity = zoneOpacitiesBySeverity(hazard.severity)

    ;[
      { radius: 5000, fillOpacity: opacity.l3, weight: 1 },
      { radius: 3000, fillOpacity: opacity.l2, weight: 1 },
      { radius: 1000, fillOpacity: opacity.l1, weight: 2 },
    ].forEach((zone) => {
      L.circle(hazard.coordinates, {
        radius: zone.radius,
        color: meta.color,
        fillColor: meta.color,
        fillOpacity: zone.fillOpacity,
        opacity: 0.45,
        weight: zone.weight,
        interactive: false,
      }).addTo(markersLayer)
    })

    const marker = L.circleMarker(hazard.coordinates, {
      radius: markerRadius(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.82,
      weight: 2,
    })

    marker.bindPopup(
      `<div style="min-width: 200px;">
        <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(hazard.title)}</div>
        <div style="font-size: 12px; margin-bottom: 8px;">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
        <div style="font-size: 11px; color: #5f6b66;">
          ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel[hazard.severity] || 'Unknown')}<br />
          Category: ${escapeHtml(hazard.type === 'other' ? 'Other' : (hazard.riskCategory || meta.label || 'Unspecified'))}<br />
          Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
          Source: ${escapeHtml(hazard.source)}
        </div>
      </div>`
    )
    marker.addTo(markersLayer)
  })

  if (!hasFittedOnce && points.length) {
    const bounds = clampBoundsToVictoria(L.latLngBounds(points.map((h) => h.coordinates)))
    mapInstance.fitBounds(bounds.pad(0.28), { animate: false })
    hasFittedOnce = true
  }
}

function switchMapStyle(styleId) {
  if (!mapInstance || !MAP_VISUAL_STYLES[styleId] || selectedMapStyle.value === styleId) return
  selectedMapStyle.value = styleId
  if (baseTileLayer) mapInstance.removeLayer(baseTileLayer)
  baseTileLayer = createLeafletBaseLayer(L, styleId).addTo(mapInstance)
  markersLayer?.bringToFront()
  userLocationLayer?.bringToFront()
}

function recenterMap() {
  isViewingUserLocation.value = false
  if (props.hazards.length && hasFittedOnce) {
    const points = props.hazards.filter((hazard) => Array.isArray(hazard.coordinates) && hazard.coordinates.length === 2)
    if (points.length) {
      const bounds = clampBoundsToVictoria(L.latLngBounds(points.map((h) => h.coordinates)))
      mapInstance?.fitBounds(bounds.pad(0.28), { animate: true })
      return
    }
  }
  mapInstance?.flyTo(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { duration: 0.55 })
}

function renderUserLocation(point) {
  if (!userLocationLayer) return
  userLocationLayer.clearLayers()

  L.circleMarker([point.lat, point.lng], {
    radius: 8,
    color: '#ffffff',
    fillColor: '#173b31',
    fillOpacity: 1,
    weight: 3,
  }).bindPopup('Your current location', { className: 'hs-home-map-popup' }).addTo(userLocationLayer)

  L.circle([point.lat, point.lng], {
    radius: Math.max(point.accuracy || 0, 80),
    color: '#173b31',
    fillColor: '#173b31',
    fillOpacity: 0.08,
    opacity: 0.24,
    weight: 1,
    interactive: false,
  }).addTo(userLocationLayer)
}

function locateUser() {
  if (isViewingUserLocation.value) {
    recenterMap()
    return
  }

  if (!navigator.geolocation || isLocatingUser.value) return
  isLocatingUser.value = true

  navigator.geolocation.getCurrentPosition(
    (position) => {
      isLocatingUser.value = false
      const point = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
        accuracy: position.coords.accuracy,
      }

      if (!isLatLngInVictoria({ lat: point.lat, lng: point.lng })) {
        window.alert('Your current location is outside Victoria, so it cannot be shown on this map.')
        return
      }

      renderUserLocation(point)
      isViewingUserLocation.value = true
      mapInstance?.flyTo([point.lat, point.lng], Math.max(mapInstance.getZoom(), 13), { duration: 0.65 })
    },
    () => {
      isLocatingUser.value = false
      window.alert('Unable to access your current location. Please allow location access in your browser.')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  )
}

onMounted(() => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: false,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.minZoom)
  applyVictoriaMapConstraints(mapInstance)

  baseTileLayer = createLeafletBaseLayer(L, selectedMapStyle.value).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)
  userLocationLayer = L.layerGroup().addTo(mapInstance)
  drawHazards()
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

watch(
  () => props.hazards,
  () => drawHazards(),
  { deep: true }
)
</script>

<template>
  <div class="home-preview-map-shell">
    <div ref="mapElement" class="home-preview-map"></div>
    <div class="home-preview-map-status">
      <span class="material-symbols-outlined" aria-hidden="true">radar</span>
      <strong>{{ props.hazards.length }}</strong>
      <span>signals</span>
    </div>
    <div class="home-preview-map-controls">
      <button class="home-preview-map-control-btn" type="button" aria-label="Zoom in" title="Zoom in" @click="mapInstance?.zoomIn()">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
      </button>
      <button class="home-preview-map-control-btn" type="button" aria-label="Zoom out" title="Zoom out" @click="mapInstance?.zoomOut()">
        <span class="material-symbols-outlined" aria-hidden="true">remove</span>
      </button>
      <button
        class="home-preview-map-control-btn"
        type="button"
        :aria-label="isViewingUserLocation ? 'Return to Victoria map' : 'Go to my location'"
        :title="isViewingUserLocation ? 'Return to Victoria map' : 'Go to my location'"
        :disabled="isLocatingUser"
        @click="locateUser"
      >
        <span class="material-symbols-outlined" aria-hidden="true">{{ isViewingUserLocation ? 'public' : 'my_location' }}</span>
      </button>
    </div>
    <div class="home-preview-map-style-switcher" aria-label="Map style">
      <button
        v-for="(style, styleId) in MAP_VISUAL_STYLES"
        :key="styleId"
        type="button"
        class="home-preview-map-style-btn"
        :class="{ 'home-preview-map-style-btn--active': selectedMapStyle === styleId }"
        @click="switchMapStyle(styleId)"
      >
        {{ style.shortLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.home-preview-map-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.home-preview-map {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.home-preview-map :deep(.leaflet-pane) {
  z-index: 10;
}

.home-preview-map :deep(.leaflet-top),
.home-preview-map :deep(.leaflet-bottom) {
  z-index: 20;
}

.home-preview-map-status {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  border: 1px solid rgba(33, 72, 59, 0.16);
  border-radius: 999px;
  padding: 0.44rem 0.65rem;
  background: rgba(255, 250, 242, 0.9);
  color: #173b31;
  box-shadow: 0 14px 34px rgba(23, 59, 49, 0.14);
  backdrop-filter: blur(14px);
}

.home-preview-map-status .material-symbols-outlined {
  font-size: 1rem;
  color: #2f604e;
}

.home-preview-map-status strong,
.home-preview-map-status span:last-child {
  font-size: 0.74rem;
  font-weight: 850;
}

.home-preview-map-controls {
  position: absolute;
  right: 1rem;
  top: 1rem;
  z-index: 500;
  display: grid;
  gap: 0.42rem;
}

.home-preview-map-control-btn {
  width: 2.45rem;
  height: 2.45rem;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 999px;
  background: rgba(255, 250, 242, 0.94);
  color: #173b31;
  display: grid;
  place-items: center;
  box-shadow: 0 12px 26px rgba(24, 63, 50, 0.15);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.home-preview-map-control-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(33, 72, 59, 0.28);
  background: #fffaf2;
}

.home-preview-map-control-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.home-preview-map-control-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

.home-preview-map-style-switcher {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 500;
  display: inline-flex;
  gap: 0.3rem;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 999px;
  padding: 0.25rem;
  background: rgba(255, 250, 242, 0.92);
  box-shadow: 0 14px 34px rgba(24, 63, 50, 0.14);
  backdrop-filter: blur(14px);
}

.home-preview-map-style-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.42rem 0.68rem;
  background: transparent;
  color: #405a51;
  font-size: 0.72rem;
  font-weight: 850;
}

.home-preview-map-style-btn--active {
  background: #173b31;
  color: #fffaf2;
  box-shadow: 0 8px 18px rgba(23, 59, 49, 0.22);
}

.home-preview-map :deep(.hs-home-map-popup .leaflet-popup-content-wrapper) {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.9rem;
  background: rgba(255, 250, 242, 0.96);
  color: #173b31;
  box-shadow: 0 18px 44px rgba(23, 59, 49, 0.18);
  backdrop-filter: blur(14px);
}
</style>
