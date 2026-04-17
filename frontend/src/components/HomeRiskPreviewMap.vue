<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  applyVictoriaMapConstraints,
  clampBoundsToVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'

const props = defineProps({
  hazards: {
    type: Array,
    default: () => [],
  },
})

const mapElement = ref(null)
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
let markersLayer
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

onMounted(() => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.minZoom)
  applyVictoriaMapConstraints(mapInstance)

  mapInstance.attributionControl.setPrefix(false)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  markersLayer = L.layerGroup().addTo(mapInstance)
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
  <div ref="mapElement" class="home-preview-map"></div>
</template>

<style scoped>
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

.home-preview-map :deep(.leaflet-control-attribution) {
  font-size: 10px;
  line-height: 1.15;
  color: rgba(42, 62, 55, 0.46);
  background: rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(4px);
  border-radius: 6px 0 0 0;
  padding: 2px 6px;
  transition: all 0.22s ease;
}

.home-preview-map :deep(.leaflet-control-attribution:hover) {
  color: rgba(42, 62, 55, 0.78);
  background: rgba(255, 255, 255, 0.78);
}

.home-preview-map :deep(.leaflet-control-attribution a) {
  color: inherit;
}
</style>
