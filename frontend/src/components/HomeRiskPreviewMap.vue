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
const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}
const otherCategoryPalette = ['#2E7D6B', '#9A3412', '#0369A1', '#7C3AED', '#B45309', '#BE185D', '#0F766E', '#475569']

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

function normalizeCategoryKey(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'unspecified'
  return raw.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatCategoryLabel(value) {
  const normalized = normalizeCategoryKey(value)
  if (normalized === 'unspecified') return 'Unspecified'
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function hashCode(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function colorForOtherCategory(categoryKey) {
  const bucket = hashCode(normalizeCategoryKey(categoryKey)) % otherCategoryPalette.length
  return otherCategoryPalette[bucket]
}

function resolveHazardVisual(hazard) {
  if (hazard?.type !== 'other') return layerMeta[hazard?.type] || layerMeta.other

  const category = formatCategoryLabel(hazard?.riskCategory || '')
  return {
    label: category,
    color: colorForOtherCategory(category),
  }
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
      `<div style="min-width:180px">
        <div style="font-weight:700;margin-bottom:4px">${escapeHtml(hazard.title)}</div>
        <div style="font-size:11px;color:#5d6b66">${escapeHtml(meta.label)} · ${escapeHtml(hazard.severity)}</div>
        <div style="font-size:11px;color:#5d6b66">Category: ${escapeHtml(formatCategoryLabel(hazard?.riskCategory || ''))}</div>
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
