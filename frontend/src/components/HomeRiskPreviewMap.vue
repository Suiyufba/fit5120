<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  hazards: {
    type: Array,
    default: () => [],
  },
})

const mapElement = ref(null)
const severityOrder = { extreme: 4, high: 3, moderate: 2, low: 1 }
const layerMeta = {
  fire: { label: 'Fire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  other: { label: 'Other', color: '#2E7D6B' },
}

let mapInstance
let markersLayer
let hasFittedOnce = false

function markerRadius(severity) {
  if (severity === 'extreme') return 11
  if (severity === 'high') return 9
  if (severity === 'moderate') return 7
  return 6
}

function drawHazards() {
  if (!markersLayer) return
  markersLayer.clearLayers()

  const points = [...props.hazards]
    .filter((hazard) => Array.isArray(hazard.coordinates) && hazard.coordinates.length === 2)
    .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))

  points.forEach((hazard) => {
    const meta = layerMeta[hazard.type] || layerMeta.other
    const marker = L.circleMarker(hazard.coordinates, {
      radius: markerRadius(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.82,
      weight: 2,
    })

    marker.bindPopup(
      `<div style="min-width:180px">
        <div style="font-weight:700;margin-bottom:4px">${hazard.title}</div>
        <div style="font-size:11px;color:#5d6b66">${meta.label} · ${hazard.severity}</div>
      </div>`
    )
    marker.addTo(markersLayer)
  })

  if (!hasFittedOnce && points.length) {
    const bounds = L.latLngBounds(points.map((h) => h.coordinates))
    mapInstance.fitBounds(bounds.pad(0.28), { animate: false })
    hasFittedOnce = true
  }
}

onMounted(() => {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView([-37.8136, 144.9631], 6)

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
}
</style>
