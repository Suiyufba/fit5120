<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  applyVictoriaMapConstraints,
  clampBoundsToVictoria,
  getMapBboxWithinVictoria,
  isLatLngInVictoria,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'
import {
  createLeafletBaseLayer,
  DEFAULT_MAP_VISUAL_STYLE,
  MAP_VISUAL_STYLES,
} from '../utils/mapVisualStyles'

const props = defineProps({
  startPoint: { type: Object, default: null },
  endPoint: { type: Object, default: null },
  routeChoices: { type: Array, default: () => [] },
  selectedRouteId: { type: String, default: '' },
})

const emit = defineEmits(['map-click', 'map-style-change'])

const mapElement = ref(null)
const selectedMapStyle = ref(DEFAULT_MAP_VISUAL_STYLE)
const isLocatingUser = ref(false)
const isViewingUserLocation = ref(false)

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}
const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }

let mapInstance
let baseTileLayer
let markerLayer
let routeLayer
let hazardLayer
let userLocationLayer
let hazardInflightController
let hazardRefreshTimer
let hazards = []

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

function zoneOpacitiesBySeverity(severity) {
  if (severity === 'extreme') return { l1: 0.28, l2: 0.18, l3: 0.1 }
  if (severity === 'high') return { l1: 0.23, l2: 0.14, l3: 0.08 }
  if (severity === 'moderate') return { l1: 0.18, l2: 0.11, l3: 0.06 }
  return { l1: 0.14, l2: 0.09, l3: 0.05 }
}

function markerRadiusBySeverity(severity) {
  if (severity === 'extreme') return 9
  if (severity === 'high') return 8
  if (severity === 'moderate') return 7
  return 6
}

function renderMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()

  if (props.startPoint) {
    L.marker([props.startPoint.lat, props.startPoint.lng], {
      icon: L.divIcon({
        className: 'planner-anchor-icon',
        html: '<div class="planner-anchor planner-anchor--start">S</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).bindPopup('Start point').addTo(markerLayer)
  }

  if (props.endPoint) {
    L.marker([props.endPoint.lat, props.endPoint.lng], {
      icon: L.divIcon({
        className: 'planner-anchor-icon',
        html: '<div class="planner-anchor planner-anchor--end">E</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).bindPopup('Destination').addTo(markerLayer)
  }
}

function drawHazards() {
  if (!hazardLayer) return
  hazardLayer.clearLayers()

  hazards.forEach((hazard) => {
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return
    const meta = layerMeta[hazard.type] || layerMeta.other
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
        opacity: 0.4,
        weight: zone.weight,
        interactive: false,
      }).addTo(hazardLayer)
    })

    L.circleMarker(hazard.coordinates, {
      radius: markerRadiusBySeverity(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.88,
      weight: 2,
    })
      .bindPopup(
        `<div style="min-width: 200px;">
          <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(hazard.title)}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
          <div style="font-size: 11px; color: #5f6b66;">
            ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel[hazard.severity] || 'Unknown')}<br />
            Category: ${escapeHtml(hazard.type === 'other' ? 'Other' : (hazard.riskCategory || meta.label || 'Unspecified'))}<br />
            Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
            Source: ${escapeHtml(hazard.source)}
          </div>
        </div>`,
        { className: 'hs-map-popup' }
      )
      .addTo(hazardLayer)
  })
}

async function loadHazards() {
  if (!mapInstance) return
  if (hazardInflightController) hazardInflightController.abort()
  hazardInflightController = new AbortController()

  try {
    const payload = await fetchRealtimeHazards({
      bbox: getMapBboxWithinVictoria(mapInstance),
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: hazardInflightController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        hazards = freshPayload.hazards
        drawHazards()
      },
    })
    hazards = payload.hazards
    drawHazards()
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    console.error('Failed to load hazards on planner map:', nextError)
  }
}

function drawRoutes() {
  if (!routeLayer) return
  routeLayer.clearLayers()

  const choices = props.routeChoices
  choices.forEach((route) => {
    if (!Array.isArray(route.geometry) || route.geometry.length < 2) return
    const isSelected = props.selectedRouteId === route.id
    const routeColor = route.slotDifficulty === 'Hard' ? '#A6382A' : route.slotDifficulty === 'Moderate' ? '#5A4B81' : '#1F6E57'
    L.polyline(route.geometry, {
      color: routeColor,
      weight: isSelected ? 6 : 4,
      opacity: isSelected ? 0.9 : 0.55,
      dashArray: isSelected ? '' : '8 8',
    }).addTo(routeLayer)
  })

  const currentSelected = choices.find((r) => r.id === props.selectedRouteId)
  if (currentSelected?.geometry?.length) {
    const bounds = clampBoundsToVictoria(L.latLngBounds(currentSelected.geometry))
    mapInstance.fitBounds(bounds.pad(0.2))
  }
}

function switchMapStyle(styleId) {
  if (!mapInstance || !MAP_VISUAL_STYLES[styleId] || selectedMapStyle.value === styleId) return
  selectedMapStyle.value = styleId
  if (baseTileLayer) mapInstance.removeLayer(baseTileLayer)
  baseTileLayer = createLeafletBaseLayer(L, styleId).addTo(mapInstance)
  hazardLayer?.bringToFront()
  routeLayer?.bringToFront()
  markerLayer?.bringToFront()
  userLocationLayer?.bringToFront()
  emit('map-style-change', styleId)
}

function recenterMap() {
  isViewingUserLocation.value = false
  mapInstance?.flyTo(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { duration: 0.55 })
}

function focusPoint(point) {
  if (!mapInstance || !point) return
  mapInstance.flyTo([point.lat, point.lng], Math.max(mapInstance.getZoom(), 11), { duration: 0.45 })
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
  }).bindPopup('Your current location', { className: 'hs-map-popup' }).addTo(userLocationLayer)

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

      if (!isLatLngInVictoria(L.latLng(point.lat, point.lng))) {
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
    fadeAnimation: false,
    markerZoomAnimation: false,
    zoomAnimation: false,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { animate: false })
  applyVictoriaMapConstraints(mapInstance)
  baseTileLayer = createLeafletBaseLayer(L, selectedMapStyle.value).addTo(mapInstance)

  markerLayer = L.layerGroup().addTo(mapInstance)
  hazardLayer = L.layerGroup().addTo(mapInstance)
  routeLayer = L.layerGroup().addTo(mapInstance)
  userLocationLayer = L.layerGroup().addTo(mapInstance)

  loadHazards()
  hazardRefreshTimer = window.setInterval(loadHazards, 60_000)
  mapInstance.on('moveend', loadHazards)

  mapInstance.on('click', (event) => {
    if (!isLatLngInVictoria(event.latlng)) return
    emit('map-click', {
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6)),
    })
  })
})

onUnmounted(() => {
  if (hazardInflightController) hazardInflightController.abort()
  if (hazardRefreshTimer) window.clearInterval(hazardRefreshTimer)
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

watch(() => props.startPoint, renderMarkers)
watch(() => props.endPoint, renderMarkers)
watch(() => [props.routeChoices, props.selectedRouteId], () => drawRoutes(), { deep: true })

defineExpose({ focusPoint })
</script>

<template>
  <section class="planner-map-wrap">
    <div ref="mapElement" class="planner-map"></div>
    <div class="planner-map-status">
      <span class="material-symbols-outlined" aria-hidden="true">route</span>
      <strong>{{ props.startPoint && props.endPoint ? 'Ready' : props.startPoint ? 'Pick destination' : 'Pick start' }}</strong>
    </div>
    <div class="planner-map-controls">
      <button class="planner-map-control-btn" type="button" aria-label="Zoom in" title="Zoom in" @click="mapInstance?.zoomIn()">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
      </button>
      <button class="planner-map-control-btn" type="button" aria-label="Zoom out" title="Zoom out" @click="mapInstance?.zoomOut()">
        <span class="material-symbols-outlined" aria-hidden="true">remove</span>
      </button>
      <button
        class="planner-map-control-btn"
        type="button"
        :aria-label="isViewingUserLocation ? 'Return to Victoria map' : 'Go to my location'"
        :title="isViewingUserLocation ? 'Return to Victoria map' : 'Go to my location'"
        :disabled="isLocatingUser"
        @click="locateUser"
      >
        <span class="material-symbols-outlined" aria-hidden="true">{{ isViewingUserLocation ? 'public' : 'my_location' }}</span>
      </button>
    </div>
    <div class="planner-map-style-switcher" aria-label="Map style">
      <button
        v-for="(style, styleId) in MAP_VISUAL_STYLES"
        :key="styleId"
        type="button"
        class="planner-map-style-btn"
        :class="{ 'planner-map-style-btn--active': selectedMapStyle === styleId }"
        @click="switchMapStyle(styleId)"
      >
        {{ style.shortLabel }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.planner-map-wrap {
  position: relative;
  padding: 0.85rem;
  background:
    linear-gradient(135deg, rgba(23, 59, 49, 0.16), rgba(143, 174, 131, 0.14)),
    #dfe8dd;
}

.planner-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 1.15rem;
  background: #dfe8dd;
  box-shadow: inset 0 0 0 1px rgba(33, 72, 59, 0.1), 0 24px 70px rgba(23, 59, 49, 0.18);
}

.planner-map-status {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid rgba(33, 72, 59, 0.16);
  border-radius: 999px;
  padding: 0.5rem 0.72rem;
  background: rgba(255, 250, 242, 0.9);
  color: #173b31;
  box-shadow: 0 14px 34px rgba(23, 59, 49, 0.14);
  backdrop-filter: blur(14px);
}

.planner-map-status .material-symbols-outlined {
  font-size: 1.05rem;
  color: #2f604e;
}

.planner-map-status strong {
  font-size: 0.78rem;
  font-weight: 850;
}

.planner-map-controls {
  position: absolute;
  right: 1.25rem;
  top: 1.25rem;
  z-index: 500;
  display: grid;
  gap: 0.45rem;
}

.planner-map-control-btn {
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

.planner-map-control-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(33, 72, 59, 0.28);
  background: #fffaf2;
}

.planner-map-control-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.planner-map-control-btn .material-symbols-outlined {
  font-size: 1.2rem;
}

.planner-map-style-switcher {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
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

.planner-map-style-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.42rem 0.68rem;
  background: transparent;
  color: #405a51;
  font-size: 0.72rem;
  font-weight: 850;
}

.planner-map-style-btn--active {
  background: #173b31;
  color: #fffaf2;
  box-shadow: 0 8px 18px rgba(23, 59, 49, 0.22);
}

.planner-map :deep(.hs-map-popup .leaflet-popup-content-wrapper) {
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.9rem;
  background: rgba(255, 250, 242, 0.96);
  color: #173b31;
  box-shadow: 0 18px 44px rgba(23, 59, 49, 0.18);
  backdrop-filter: blur(14px);
}

.planner-map :deep(.hs-map-popup .leaflet-popup-content) {
  margin: 0.85rem;
}

.planner-map :deep(.hs-map-popup .leaflet-popup-tip) {
  background: rgba(255, 250, 242, 0.96);
}

.planner-map :deep(.planner-anchor-icon) {
  background: transparent;
  border: none;
}

.planner-map :deep(.planner-anchor) {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.24);
  border: 2px solid #ffffff;
}

.planner-map :deep(.planner-anchor--start) {
  background: #0f172a;
  color: #ffffff;
}

.planner-map :deep(.planner-anchor--end) {
  background: #ffffff;
  color: #0f172a;
  border-color: #0f172a;
}

@media (max-width: 980px) {
  .planner-map-wrap {
    min-height: var(--mobile-safe-height);
  }

  .planner-map-status {
    top: 1.15rem;
    left: 1.15rem;
    max-width: calc(100% - 6rem);
  }

  .planner-map-style-switcher {
    right: 1.15rem;
    bottom: calc(var(--mobile-sheet-peek, 250px) + 1rem);
  }
}
</style>
