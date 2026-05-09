<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { restoreLatestRoutePlan, setLatestRoutePlan } from '../services/routePlanStore'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { planSafeRoute } from '../services/routeApi'

const router = useRouter()
const route = useRoute()
const mapElement = ref(null)
const plan = ref(null)
const planningFromShare = ref(false)
const shareMessage = ref('')
const shareError = ref('')
const mapInitError = ref('')
const isSheetExpanded = ref(false)
const isTerrain3D = ref(true)

const routeSourceId = 'recommended-route-source'
const routeLayerId = 'recommended-route-line'
const routeCasingLayerId = 'recommended-route-line-casing'
const hazardZoneSourceId = 'hazard-zone-source'
const hazardZoneLayerId = 'hazard-zone-layer'
const hazardPointSourceId = 'hazard-point-source'
const hazardPointLayerId = 'hazard-point-layer'
const terrainSourceId = 'mapbox-dem'
const terrainHillshadeLayerId = 'terrain-hillshade-layer'

let mapInstance
let mapReady = false
let hazardInflightController
let hazardRefreshTimer
let startMarker
let endMarker
let activeHazardPopup
let compassButtonElement = null

const hazards = ref([])
const mapboxToken = String(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim()

const layerMeta = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const severityLabel = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }
const routeDifficultySlots = ['Easy', 'Moderate', 'Hard']
const THREE_D_CAMERA = { pitch: 74, bearing: 36 }

const selectedRouteId = ref('')

function buildRouteChoices(planPayload) {
  if (!planPayload) return []

  const fromApi = Array.isArray(planPayload.routeOptions) ? planPayload.routeOptions.slice(0, 3) : []
  if (fromApi.length) {
    const selected = []
    const usedIds = new Set()

    routeDifficultySlots.forEach((slot) => {
      const matchBySlot = fromApi.find((item) => item.targetDifficulty === slot && !usedIds.has(item.id))
      const fallbackUnique = fromApi.find((item) => !usedIds.has(item.id))
      const match = matchBySlot || fallbackUnique || null
      if (!match) return
      usedIds.add(match.id)
      selected.push({ ...match, slotDifficulty: slot, optionLabel: slot })
    })

    return selected
  }

  const pool = [planPayload.recommendedRoute, ...(planPayload.alternatives || [])].filter(Boolean)
  const selected = []
  const usedIds = new Set()
  routeDifficultySlots.forEach((slot) => {
    const hit = pool.find((item) => item.difficulty === slot && !usedIds.has(item.id))
    if (!hit) return
    usedIds.add(hit.id)
    selected.push({ ...hit, slotDifficulty: slot, optionLabel: slot })
  })
  pool.forEach((item) => {
    if (selected.length >= 3 || usedIds.has(item.id)) return
    const slot = routeDifficultySlots[selected.length] || item.difficulty || 'Moderate'
    usedIds.add(item.id)
    selected.push({ ...item, slotDifficulty: slot, optionLabel: slot })
  })
  return selected.slice(0, 3)
}

const routeChoices = computed(() => buildRouteChoices(plan.value))

const recommended = computed(() => {
  const choices = routeChoices.value
  if (choices.length) {
    const current = choices.find((item) => item.id === selectedRouteId.value)
    return current || choices[0]
  }
  return plan.value?.recommendedRoute || null
})

function selectRoute(routeId) {
  if (!routeId || routeId === selectedRouteId.value) return
  selectedRouteId.value = routeId
  if (plan.value) {
    const pick = routeChoices.value.find((item) => item.id === routeId)
    if (pick) {
      setLatestRoutePlan({
        ...plan.value,
        recommendedRoute: pick,
      })
    }
  }
}
const prepTips = computed(() => recommended.value?.suggestedPrep || [])
const geography = computed(() => recommended.value?.geographyProfile || null)
const recommendedGoNoGoLabel = computed(() => {
  const value = recommended.value?.safetyStatus || recommended.value?.goNoGo || ''
  if (value === 'No-Go' || value === 'Dangerous') return 'Dangerous'
  return 'Safe'
})
const recommendedIsDangerous = computed(() => {
  const value = recommended.value?.safetyStatus || recommended.value?.goNoGo
  return value === 'No-Go' || value === 'Dangerous'
})

function formatDuration(durationMin) {
  const mins = Math.max(Number(durationMin) || 0, 0)
  if (mins < 90) return `${Math.round(mins)} min`

  const totalHours = mins / 60
  if (totalHours < 24) {
    const hours = Math.floor(totalHours)
    const remainingMin = Math.round(mins % 60)
    if (!remainingMin) return `${hours} h`
    return `${hours} h ${remainingMin} min`
  }

  const days = Math.floor(totalHours / 24)
  const hours = Math.round(totalHours % 24)
  return hours ? `${days} d ${hours} h` : `${days} d`
}

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

function createPin(label, colors) {
  const el = document.createElement('div')
  el.className = 'route-pin-marker'
  el.innerHTML = `<span style="background:${colors.bg};border-color:${colors.border};">${label}</span>`
  return el
}

function routeGeometryToLngLat(geometry = []) {
  return geometry
    .filter((point) => Array.isArray(point) && point.length === 2)
    .map(([lat, lng]) => [Number(lng), Number(lat)])
    .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
}

function inferStartEndFromPlan() {
  if (plan.value?.start && plan.value?.end) {
    return { start: plan.value.start, end: plan.value.end }
  }

  const geometry = plan.value?.recommendedRoute?.geometry || []
  if (geometry.length < 2) return null
  const start = geometry[0]
  const end = geometry[geometry.length - 1]
  return {
    start: { lat: start[0], lng: start[1] },
    end: { lat: end[0], lng: end[1] },
  }
}

function isThreeDReady() {
  const points = inferStartEndFromPlan()
  return Boolean(points?.start && points?.end && recommended.value?.geometry?.length)
}

function toFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  }
}

function focusRouteIn3D(routeCoordinates, animated = true) {
  if (!mapInstance || !routeCoordinates.length) return

  const bounds = routeCoordinates.reduce(
    (acc, coordinate) => acc.extend(coordinate),
    new mapboxgl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]),
  )

  mapInstance.fitBounds(bounds, {
    padding: { top: 80, right: 90, bottom: 100, left: 90 },
    duration: animated ? 950 : 0,
    pitch: isThreeDReady() ? THREE_D_CAMERA.pitch : 0,
    bearing: isThreeDReady() ? THREE_D_CAMERA.bearing : 0,
  })
}

function syncTerrainModeFromCamera() {
  if (!mapInstance) return
  isTerrain3D.value = mapInstance.getPitch() > 20
}

function setCameraTo2D(animated = true) {
  if (!mapInstance) return
  mapInstance.easeTo({
    pitch: 0,
    bearing: 0,
    duration: animated ? 650 : 0,
    essential: true,
  })
  isTerrain3D.value = false
}

function buildHazardZoneFeatures() {
  const features = []

  hazards.value.forEach((hazard) => {
    const meta = layerMeta[hazard.type] || layerMeta.other
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return

    const [lat, lng] = hazard.coordinates
    const severity = hazard.severity || 'low'
    const opacities = severity === 'extreme'
      ? { near: 0.24, mid: 0.15, far: 0.08 }
      : severity === 'high'
        ? { near: 0.2, mid: 0.12, far: 0.07 }
        : severity === 'moderate'
          ? { near: 0.16, mid: 0.1, far: 0.06 }
          : { near: 0.13, mid: 0.08, far: 0.05 }

    ;[
      { key: 'far', radius: 34, opacity: opacities.far },
      { key: 'mid', radius: 24, opacity: opacities.mid },
      { key: 'near', radius: 14, opacity: opacities.near },
    ].forEach((zone) => {
      features.push({
        type: 'Feature',
        properties: {
          id: `${hazard.id || hazard.title || 'hazard'}-${zone.key}`,
          color: meta.color,
          radius: zone.radius,
          opacity: zone.opacity,
        },
        geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
      })
    })
  })

  return features
}

function buildHazardPointFeatures() {
  const features = []

  hazards.value.forEach((hazard) => {
    const meta = layerMeta[hazard.type] || layerMeta.other
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return

    const [lat, lng] = hazard.coordinates
    const severity = hazard.severity || 'low'
    const markerRadius = severity === 'extreme' ? 8 : severity === 'high' ? 7 : severity === 'moderate' ? 6 : 5

    features.push({
      type: 'Feature',
      properties: {
        id: String(hazard.id || `${hazard.type}-${hazard.title}`),
        title: hazard.title || 'Hazard',
        description: cleanPopupDescription(hazard.description || ''),
        severity,
        type: hazard.type || 'other',
        category: hazard.type === 'other' ? 'Other' : (hazard.riskCategory || meta.label || 'Unspecified'),
        source: hazard.source || 'Unknown',
        updatedAt: formatUpdatedTime(hazard.updatedAt),
        color: meta.color,
        radius: markerRadius,
        label: meta.label,
      },
      geometry: {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
      },
    })
  })

  return features
}

function applyRouteGeometry() {
  if (!mapInstance || !mapReady) return

  const routeCoordinates = routeGeometryToLngLat(recommended.value?.geometry || [])
  const routeData = toFeatureCollection(routeCoordinates.length
    ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoordinates }, properties: { id: 'recommended-route' } }]
    : [])

  const existingSource = mapInstance.getSource(routeSourceId)
  if (existingSource) {
    existingSource.setData(routeData)
  } else {
    mapInstance.addSource(routeSourceId, {
      type: 'geojson',
      data: routeData,
    })
    mapInstance.addLayer({
      id: routeCasingLayerId,
      type: 'line',
      source: routeSourceId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 10,
        'line-opacity': 0.75,
      },
    })
    mapInstance.addLayer({
      id: routeLayerId,
      type: 'line',
      source: routeSourceId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#1F6E57',
        'line-width': 6,
        'line-opacity': 0.92,
      },
    })
  }

  if (startMarker) {
    startMarker.remove()
    startMarker = null
  }
  if (endMarker) {
    endMarker.remove()
    endMarker = null
  }

  if (routeCoordinates.length >= 2) {
    startMarker = new mapboxgl.Marker({ element: createPin('S', { bg: '#2E9D7A', border: '#1F6E57' }) })
      .setLngLat(routeCoordinates[0])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Start'))
      .addTo(mapInstance)

    endMarker = new mapboxgl.Marker({ element: createPin('E', { bg: '#D84727', border: '#A6382A' }) })
      .setLngLat(routeCoordinates[routeCoordinates.length - 1])
      .setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Destination'))
      .addTo(mapInstance)

    focusRouteIn3D(routeCoordinates, true)

    if (isThreeDReady()) {
      window.setTimeout(() => {
        if (!mapInstance) return
        mapInstance.easeTo({
          pitch: THREE_D_CAMERA.pitch,
          bearing: THREE_D_CAMERA.bearing,
          duration: 850,
          essential: true,
        })
      }, 980)
    }
  }
}

function applyHazardLayers() {
  if (!mapInstance || !mapReady) return

  const zoneData = toFeatureCollection(buildHazardZoneFeatures())
  const pointData = toFeatureCollection(buildHazardPointFeatures())

  const zoneSource = mapInstance.getSource(hazardZoneSourceId)
  if (zoneSource) {
    zoneSource.setData(zoneData)
  } else {
    mapInstance.addSource(hazardZoneSourceId, { type: 'geojson', data: zoneData })
    mapInstance.addLayer({
      id: hazardZoneLayerId,
      type: 'circle',
      source: hazardZoneSourceId,
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-opacity': ['get', 'opacity'],
      },
    })
  }

  const pointSource = mapInstance.getSource(hazardPointSourceId)
  if (pointSource) {
    pointSource.setData(pointData)
  } else {
    mapInstance.addSource(hazardPointSourceId, { type: 'geojson', data: pointData })
    mapInstance.addLayer({
      id: hazardPointLayerId,
      type: 'circle',
      source: hazardPointSourceId,
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    })

    mapInstance.on('mouseenter', hazardPointLayerId, () => {
      mapInstance.getCanvas().style.cursor = 'pointer'
    })

    mapInstance.on('mouseleave', hazardPointLayerId, () => {
      mapInstance.getCanvas().style.cursor = ''
    })

    mapInstance.on('click', hazardPointLayerId, (event) => {
      const clickedFeature = event?.features?.[0]
      if (!clickedFeature?.properties) return

      if (activeHazardPopup) {
        activeHazardPopup.remove()
        activeHazardPopup = null
      }

      const props = clickedFeature.properties
      const title = escapeHtml(props.title || 'Hazard')
      const desc = escapeHtml(props.description || '')
      const label = escapeHtml(props.label || 'Other')
      const severity = escapeHtml(severityLabel[props.severity] || 'Unknown')
      const category = escapeHtml(props.category || 'Unspecified')
      const updatedAt = escapeHtml(props.updatedAt || 'Time unknown')
      const source = escapeHtml(props.source || 'Unknown')

      activeHazardPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 })
        .setLngLat(clickedFeature.geometry.coordinates)
        .setHTML(`
          <div style="min-width: 200px;">
            <div style="font-weight: 800; margin-bottom: 6px;">${title}</div>
            <div style="font-size: 12px; margin-bottom: 8px;">${desc}</div>
            <div style="font-size: 11px; color: #5f6b66;">
              ${label} · ${severity}<br />
              Category: ${category}<br />
              Updated: ${updatedAt}<br />
              Source: ${source}
            </div>
          </div>
        `)
        .addTo(mapInstance)
    })
  }
}

async function loadHazards() {
  if (!mapInstance || !mapReady) return
  if (hazardInflightController) hazardInflightController.abort()
  hazardInflightController = new AbortController()

  try {
    const bounds = mapInstance.getBounds()
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    const payload = await fetchRealtimeHazards({
      bbox,
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: hazardInflightController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        hazards.value = freshPayload.hazards
        applyHazardLayers()
      },
    })
    hazards.value = payload.hazards
    applyHazardLayers()
  } catch (error) {
    if (error?.name === 'AbortError') return
    console.error('Failed to load hazards on route detail map:', error)
  }
}

function parseSharedPoint() {
  const asValue = (value) => Array.isArray(value) ? value[0] : value
  const slat = Number(asValue(route.query.slat))
  const slng = Number(asValue(route.query.slng))
  const elat = Number(asValue(route.query.elat))
  const elng = Number(asValue(route.query.elng))

  const allValid = [slat, slng, elat, elng].every((v) => Number.isFinite(v))
  if (!allValid) return null
  return {
    start: { lat: slat, lng: slng },
    end: { lat: elat, lng: elng },
  }
}

function buildShareUrl() {
  const points = inferStartEndFromPlan()
  if (!points) return ''
  const url = new URL(window.location.origin + '/route-detail')
  url.searchParams.set('slat', String(points.start.lat))
  url.searchParams.set('slng', String(points.start.lng))
  url.searchParams.set('elat', String(points.end.lat))
  url.searchParams.set('elng', String(points.end.lng))
  return url.toString()
}

async function shareRoute() {
  shareError.value = ''
  const shareUrl = buildShareUrl()
  if (!shareUrl) {
    shareError.value = 'No route data available to share yet.'
    return
  }

  const sharePayload = {
    title: 'HikeShield Route Plan',
    text: 'Safer pre-hike route and risk detail',
    url: shareUrl,
  }

  try {
    if (navigator.share) {
      await navigator.share(sharePayload)
      shareMessage.value = 'Route shared successfully.'
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    shareMessage.value = 'Share link copied to clipboard.'
  } catch (error) {
    shareError.value = error?.message || 'Failed to share route.'
  }
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
}

function openInGoogleMaps() {
  shareError.value = ''
  const points = inferStartEndFromPlan()
  if (!points) {
    shareError.value = 'No route data available to open in Google Maps.'
    return
  }

  const { start, end } = points
  const origin = `${start.lat},${start.lng}`
  const destination = `${end.lat},${end.lng}`

  const geometry = recommended.value?.geometry || []
  const waypointParts = []
  if (geometry.length > 2) {
    const maxWaypoints = 5
    const step = Math.floor((geometry.length - 2) / (maxWaypoints + 1))
    for (let i = 1; i <= maxWaypoints && step > 0; i += 1) {
      const point = geometry[i * step]
      if (Array.isArray(point) && point.length === 2) {
        waypointParts.push(`${point[0]},${point[1]}`)
      }
    }
  }

  let url
  if (isMobileDevice()) {
    url = `https://maps.google.com/maps?saddr=${origin}&daddr=${destination}&dirflg=w`
    if (waypointParts.length) {
      url += `&waypoints=${encodeURIComponent(waypointParts.join('|'))}`
    }
  } else {
    url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=walking`
    if (waypointParts.length) {
      url += `&waypoints=${encodeURIComponent(waypointParts.join('|'))}`
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function activateTerrainView() {
  const routeCoordinates = routeGeometryToLngLat(recommended.value?.geometry || [])
  if (!routeCoordinates.length) return
  focusRouteIn3D(routeCoordinates, true)
  isTerrain3D.value = true
}

function toggleTerrainMode() {
  if (!mapInstance) return
  if (isTerrain3D.value) {
    setCameraTo2D(true)
    return
  }
  activateTerrainView()
}

function handleCompassToggle(event) {
  event.preventDefault()
  event.stopPropagation()
  toggleTerrainMode()
}

function bindCompassToggleButton() {
  if (!mapElement.value) return
  const compass = mapElement.value.querySelector('.mapboxgl-ctrl-compass')
  if (!compass) return
  compassButtonElement = compass
  compassButtonElement.setAttribute('title', 'Toggle 2D / 3D terrain view')
  compassButtonElement.setAttribute('aria-label', 'Toggle 2D / 3D terrain view')
  compassButtonElement.addEventListener('click', handleCompassToggle, true)
}

function unbindCompassToggleButton() {
  if (!compassButtonElement) return
  compassButtonElement.removeEventListener('click', handleCompassToggle, true)
  compassButtonElement = null
}

async function hydrateFromSharedLink() {
  const shared = parseSharedPoint()
  if (!shared) return

  planningFromShare.value = true
  shareError.value = ''
  try {
    const payload = await planSafeRoute({
      start: shared.start,
      end: shared.end,
    })
    const nextPlan = {
      ...payload,
      start: shared.start,
      end: shared.end,
    }
    setLatestRoutePlan(nextPlan)
    plan.value = nextPlan
    applyRouteGeometry()
  } catch (error) {
    shareError.value = error?.message || 'Failed to load shared route.'
  } finally {
    planningFromShare.value = false
  }
}

function initMap() {
  if (!mapElement.value) return
  if (!mapboxToken) {
    mapInitError.value = 'Mapbox token is missing. Add VITE_MAPBOX_ACCESS_TOKEN to enable 3D route view.'
    return
  }

  mapboxgl.accessToken = mapboxToken

  mapInstance = new mapboxgl.Map({
    container: mapElement.value,
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [144.9631, -37.8136],
    zoom: 7,
    pitch: 0,
    bearing: 0,
    antialias: true,
    maxPitch: 85,
  })

  mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right')

  mapInstance.on('load', () => {
    mapReady = true

    if (!mapInstance.getSource(terrainSourceId)) {
      mapInstance.addSource(terrainSourceId, {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      mapInstance.setTerrain({ source: terrainSourceId, exaggeration: 1.9 })
    }

    if (!mapInstance.getLayer(terrainHillshadeLayerId)) {
      mapInstance.addLayer({
        id: terrainHillshadeLayerId,
        type: 'hillshade',
        source: terrainSourceId,
        paint: {
          'hillshade-exaggeration': 0.8,
          'hillshade-shadow-color': '#5f5a4c',
          'hillshade-highlight-color': '#efe6cd',
          'hillshade-accent-color': '#9c9277',
        },
      })
    }

    mapInstance.setFog({
      color: '#d7ebdf',
      'high-color': '#f2f8f5',
      'space-color': '#f7fbfa',
      'horizon-blend': 0.22,
    })

    applyRouteGeometry()
    applyHazardLayers()
    loadHazards()
    bindCompassToggleButton()

    hazardRefreshTimer = window.setInterval(loadHazards, 60_000)
    mapInstance.on('moveend', loadHazards)
    mapInstance.on('pitchend', syncTerrainModeFromCamera)
    mapInstance.on('rotateend', syncTerrainModeFromCamera)
  })
}

onMounted(() => {
  plan.value = restoreLatestRoutePlan()
  selectedRouteId.value = plan.value?.recommendedRoute?.id || routeChoices.value[0]?.id || ''
  initMap()
  hydrateFromSharedLink()
})

watch(
  () => plan.value,
  () => {
    if (!selectedRouteId.value) {
      selectedRouteId.value = plan.value?.recommendedRoute?.id || routeChoices.value[0]?.id || ''
    }
  },
)

watch(
  () => recommended.value?.id,
  () => {
    applyRouteGeometry()
  },
)

watch(
  () => route.fullPath,
  () => {
    if (plan.value?.recommendedRoute) return
    hydrateFromSharedLink()
  },
)

onUnmounted(() => {
  if (hazardInflightController) hazardInflightController.abort()
  if (hazardRefreshTimer) window.clearInterval(hazardRefreshTimer)
  if (activeHazardPopup) {
    activeHazardPopup.remove()
    activeHazardPopup = null
  }
  if (startMarker) {
    startMarker.remove()
    startMarker = null
  }
  if (endMarker) {
    endMarker.remove()
    endMarker = null
  }
  if (mapInstance) {
    mapInstance.off('pitchend', syncTerrainModeFromCamera)
    mapInstance.off('rotateend', syncTerrainModeFromCamera)
    unbindCompassToggleButton()
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <main class="detail-layout">
    <section class="detail-map-wrap">
      <div ref="mapElement" class="detail-map"></div>
      <p v-if="mapInitError" class="map-init-error">{{ mapInitError }}</p>
    </section>

    <aside class="detail-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': isSheetExpanded }">
      <div class="mobile-sheet__handle"></div>
      <div class="detail-mobile-actions">
        <button class="mobile-sheet-toggle" @click="toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ isSheetExpanded ? 'expand_more' : 'expand_less' }}</span>
          {{ isSheetExpanded ? 'Show Less' : 'Route Detail' }}
        </button>
      </div>
      <div class="mobile-sheet__body detail-panel__body">
      <template v-if="recommended">
        <p class="detail-kicker">Route Safety Detail</p>
        <h1>Recommended Route</h1>
        <p v-if="planningFromShare" class="detail-note">Loading shared route...</p>
        <p v-if="shareMessage" class="detail-note detail-note--ok">{{ shareMessage }}</p>
        <p v-if="shareError" class="detail-note detail-note--error">{{ shareError }}</p>

        <section v-if="routeChoices.length > 1" class="route-picker">
          <p class="route-picker__kicker">Choose One Route</p>
          <div class="route-picker__options">
            <button
              v-for="option in routeChoices"
              :key="option.id"
              type="button"
              class="route-picker__card"
              :class="{ 'route-picker__card--active': recommended?.id === option.id }"
              @click="selectRoute(option.id)"
            >
              <p class="route-picker__title">{{ option.optionLabel }}</p>
              <p class="route-picker__meta">
                {{ option.distanceKm.toFixed(1) }} km · {{ formatDuration(option.durationMin) }}
              </p>
              <p class="route-picker__risk">{{ option.riskLevel }}</p>
            </button>
          </div>
        </section>

        <div class="metric-grid">
          <article><span>Distance</span><strong>{{ recommended.distanceKm.toFixed(1) }} km</strong></article>
          <article><span>How Long It Takes</span><strong>{{ formatDuration(recommended.durationMin) }}</strong></article>
          <article><span>Difficulty</span><strong>{{ recommended.slotDifficulty || recommended.difficulty }}</strong></article>
          <article><span>Risk</span><strong>{{ recommended.riskLevel }}</strong></article>
        </div>

        <div class="status-tag" :class="{ 'status-tag--danger': recommendedIsDangerous }">
          {{ recommendedGoNoGoLabel }}
        </div>
        <p class="detail-explain">{{ recommended.intro || recommended.explanation }}</p>

        <section v-if="geography" class="risk-block">
          <h2>Geography Profile</h2>
          <article class="tip-item">
            Ascent {{ Math.round(geography.totalAscentM || 0) }} m ·
            Descent {{ Math.round(geography.totalDescentM || 0) }} m ·
            Max slope {{ Math.round(geography.maxSlopePct || 0) }}%
          </article>
        </section>

        <section class="risk-block">
          <h2>Key Risk Sections</h2>
          <article v-for="risk in recommended.keyRisks" :key="risk.id" class="risk-item">
            <strong>{{ risk.title }}</strong>
            <p>{{ risk.type }} · {{ risk.severity }} · {{ risk.distanceKm }} km away</p>
            <p class="risk-advice">{{ risk.advice }}</p>
            <small>Source: {{ risk.source }}</small>
          </article>
        </section>

        <section class="risk-block">
          <h2>Suggested Prep</h2>
          <article v-for="tip in prepTips" :key="tip" class="tip-item">{{ tip }}</article>
        </section>
      </template>

      <template v-else>
        <h1>No planned route yet</h1>
        <p class="detail-explain">Go to Plan Route and generate a safer route first.</p>
        <p v-if="shareError" class="detail-note detail-note--error">{{ shareError }}</p>
      </template>

      <button class="gmaps-btn" :disabled="!recommended" @click="openInGoogleMaps">
        <span class="material-symbols-outlined text-[18px]">open_in_new</span>
        Open in Google Maps
      </button>
      <button class="share-btn" @click="shareRoute">Share Route</button>
      <button class="back-btn" @click="router.push('/route-planner')">Back to Planner</button>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: 1fr minmax(380px, 420px);
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background:
    linear-gradient(130deg, #ffffff 0%, #f7f7f7 52%, #eef3ef 100%);
  position: relative;
}

.detail-map-wrap {
  position: relative;
  padding: 0.85rem;
  background: #eef3ef;
}

.detail-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px rgba(31, 41, 51, 0.08), 0 20px 60px rgba(17, 24, 39, 0.12);
}

.map-init-error {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  max-width: 420px;
  z-index: 2;
  border: 1px solid #e9b2a8;
  color: #7d2a21;
  background: rgba(255, 242, 239, 0.95);
  padding: 0.6rem 0.75rem;
  border-radius: 0.55rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.detail-panel {
  --mobile-sheet-peek: 255px;
  border-left: 1px solid rgba(31, 41, 51, 0.1);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-mobile-actions {
  display: none;
}

.detail-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #2e7d6b;
  font-weight: 900;
}

h1 {
  font-size: 2rem;
  line-height: 1;
  color: #111827;
  font-weight: 700;
}

.route-picker {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.8rem;
  display: grid;
  gap: 0.5rem;
}

.route-picker__kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.66rem;
  color: #2e7d6b;
  font-weight: 800;
}

.route-picker__options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}

.route-picker__card {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 8px;
  background: #ffffff;
  color: #1f2933;
  text-align: left;
  padding: 0.48rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.route-picker__card--active {
  border-color: rgba(31, 110, 87, 0.34);
  background: #e7f4ed;
  box-shadow: 0 0 0 3px rgba(31, 110, 87, 0.12);
}

.route-picker__title {
  font-size: 0.78rem;
  font-weight: 800;
}

.route-picker__meta {
  margin-top: 0.12rem;
  font-size: 0.7rem;
  color: #456359;
}

.route-picker__risk {
  margin-top: 0.18rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #33564b;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.metric-grid article {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  padding: 0.7rem;
}

.metric-grid span {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #5f6b7a;
  font-weight: 700;
}

.metric-grid strong {
  display: block;
  margin-top: 0.2rem;
  color: #111827;
}

.status-tag {
  width: fit-content;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  background: #def6ea;
  color: #136844;
  font-weight: 800;
}

.status-tag--danger {
  background: #ffe3e3;
  color: #a20f0f;
  border: 1px solid #ff8a8a;
  box-shadow: 0 0 0 2px rgba(214, 31, 31, 0.16);
}

.detail-explain {
  color: #5f6b7a;
  line-height: 1.45;
  font-size: 0.9rem;
}

.risk-block h2 {
  font-size: 0.92rem;
  color: #111827;
  font-weight: 800;
  margin-bottom: 0.45rem;
}

.risk-item,
.tip-item {
  border: 1px solid rgba(31, 41, 51, 0.1);
  border-radius: 8px;
  padding: 0.56rem;
  background: #ffffff;
  margin-bottom: 0.45rem;
}

.risk-item strong {
  color: #203d35;
}

.risk-item p,
.risk-item small,
.tip-item {
  color: #48635c;
  font-size: 0.84rem;
}

.risk-advice {
  margin-top: 0.3rem;
  color: #35544b;
}

.back-btn {
  margin-top: 0.5rem;
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 999px;
  background: #fff;
  padding: 0.66rem;
  font-weight: 700;
  color: #111827;
}

.share-btn {
  border: 0;
  border-radius: 999px;
  background: #1f6e57;
  color: #ffffff;
  padding: 0.66rem;
  font-weight: 700;
}

.gmaps-btn {
  margin-top: auto;
  border: 1px solid #c2d5cb;
  border-radius: 999px;
  background: linear-gradient(135deg, #1a73e8 0%, #1967d2 100%);
  color: #fff;
  padding: 0.66rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  box-shadow: 0 6px 14px rgba(26, 115, 232, 0.22);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.gmaps-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(26, 115, 232, 0.28);
}

.gmaps-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.detail-note {
  border: 1px solid #d9e4de;
  border-radius: 0.55rem;
  padding: 0.42rem 0.55rem;
  font-size: 0.82rem;
  color: #32564a;
  background: #f6fbf8;
}

.detail-note--ok {
  border-color: #c6dfd3;
  background: #eef8f2;
}

.detail-note--error {
  border-color: #eab8af;
  color: #7d2a21;
  background: #fff2ef;
}

@media (max-width: 980px) {
  .detail-layout {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .detail-panel {
    border-left: 0;
    border-top: 1px solid rgba(33, 72, 59, 0.14);
    padding: 0 1rem 1rem;
    background: rgba(255, 250, 242, 0.97);
  }

  .detail-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.4rem;
  }

  .detail-map-wrap {
    min-height: var(--mobile-safe-height);
  }

  .map-init-error {
    right: 1rem;
    max-width: none;
  }

  .route-picker__options {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.route-pin-marker span {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 2px solid;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 0 5px 14px rgba(13, 31, 24, 0.25);
}
</style>
