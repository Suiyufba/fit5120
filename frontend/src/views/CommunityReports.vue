<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  fetchCommunityReports,
  submitCommunityReport,
  uploadCommunityReportImage,
} from '../services/communityReportApi'
import { reverseLocation, searchLocations } from '../services/locationApi'
import {
  applyVictoriaMapConstraints,
  getMapBboxWithinVictoria,
  isLatLngInVictoria,
  VICTORIA_BOUNDS,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'

const mapElement = ref(null)

const reports = ref([])
const hazards = ref([])
const fetchedAt = ref(null)
const storageMode = ref('unknown')
const loading = ref(false)
const submitLoading = ref(false)
const error = ref('')
const submitError = ref('')
const submitSuccess = ref('')

const selectedPoint = ref(null)
const isSheetExpanded = ref(false)
const activeMobileTab = ref('submit')
const isMobileViewport = ref(false)

const addressQuery = ref('')
const addressSuggestions = ref([])
const locatingMe = ref(false)
const searchingAddress = ref(false)
const showEmergencyModal = ref(false)
const imageUploading = ref(false)
const imagePreviewUrl = ref('')
const imageError = ref('')
const imageFileInput = ref(null)
let addressSearchController = null
let reverseLookupController = null

const EMERGENCY_DISMISSED_KEY = 'hikeshield_emergency_modal_ack_v1'

const form = reactive({
  title: '',
  description: '',
  locationName: '',
  hazardType: 'trail',
  severity: 'moderate',
  reporterName: '',
  imageUrl: '',
})

const THUMBNAIL_MAX_DIMENSION = 480
const THUMBNAIL_MIME = 'image/jpeg'
const THUMBNAIL_QUALITY = 0.78
const THUMBNAIL_MAX_FILE_BYTES = 8 * 1024 * 1024

const hazardMeta = {
  fire: { label: 'Bushfire', color: '#D84727', icon: 'local_fire_department' },
  flood: { label: 'Flood', color: '#2165B5', icon: 'flood' },
  storm: { label: 'Storm', color: '#5A4B81', icon: 'rainy' },
  heat: { label: 'Heat', color: '#D08817', icon: 'thermostat' },
  trail: { label: 'Trail', color: '#6B5C4F', icon: 'warning' },
  other: { label: 'Other', color: '#2E7D6B', icon: 'campaign' },
}

const severityRank = { extreme: 4, high: 3, moderate: 2, low: 1 }

const sortedReports = computed(() => {
  return reports.value
    .slice()
    .sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))
})

const stats = computed(() => {
  const summary = { total: sortedReports.value.length, extreme: 0, high: 0, moderate: 0, low: 0 }
  sortedReports.value.forEach((item) => {
    if (summary[item.severity] !== undefined) summary[item.severity] += 1
  })
  return summary
})

const selectedPointLabel = computed(() => {
  if (!selectedPoint.value) return 'Click the map to select report location'
  return `${selectedPoint.value.lat}, ${selectedPoint.value.lng}`
})

let mapInstance
let hazardLayer
let reportLayer
let selectedPointLayer
let inflightReportController
let inflightHazardController
let refreshTimer

function getGeolocationErrorMessage(error) {
  if (error?.code === 1) {
    return 'Location permission denied. Enable location access or use address search.'
  }
  if (error?.code === 2) {
    return 'Your device could not determine its location. Open System Settings → Privacy & Security → Location Services, ensure Chrome is allowed, then retry — or pick a spot via address search or by clicking the map.'
  }
  if (error?.code === 3) {
    return 'Location lookup timed out. Try again near a window, or use address search / click the map.'
  }
  return 'Could not determine your location. Try address search or click on the map instead.'
}

function requestCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => resolve({ image, objectUrl })
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read selected image'))
    }
    image.src = objectUrl
  })
}

async function fileToThumbnail(file) {
  if (!file) throw new Error('No file selected')
  if (!file.type?.startsWith('image/')) {
    throw new Error('File must be an image')
  }
  if (file.size > THUMBNAIL_MAX_FILE_BYTES) {
    throw new Error('Image is too large. Pick a file under 8MB.')
  }

  const { image, objectUrl } = await loadImageFromBlob(file)
  try {
    const ratio = Math.min(
      1,
      THUMBNAIL_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
    )
    const targetWidth = Math.max(1, Math.round(image.naturalWidth * ratio))
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not supported in this browser')
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

    const dataUrl = canvas.toDataURL(THUMBNAIL_MIME, THUMBNAIL_QUALITY)
    return { dataUrl, width: targetWidth, height: targetHeight }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function rememberEmergencyAck() {
  try {
    sessionStorage.setItem(EMERGENCY_DISMISSED_KEY, '1')
  } catch (_error) {
    /* sessionStorage may be unavailable */
  }
}

function emergencyAlreadyAcked() {
  try {
    return sessionStorage.getItem(EMERGENCY_DISMISSED_KEY) === '1'
  } catch (_error) {
    return false
  }
}

function dismissEmergencyModal() {
  showEmergencyModal.value = false
  rememberEmergencyAck()
  // After the user confirms "No, continue reporting", run the real submit.
  if (typeof pendingSubmitAfterEmergency === 'function') {
    const next = pendingSubmitAfterEmergency
    pendingSubmitAfterEmergency = null
    next()
  }
}

function confirmEmergencyAndCall() {
  showEmergencyModal.value = false
  rememberEmergencyAck()
  pendingSubmitAfterEmergency = null
  if (typeof window !== 'undefined') {
    window.location.href = 'tel:000'
  }
}

let pendingSubmitAfterEmergency = null

function syncViewportMode() {
  if (typeof window === 'undefined') return
  isMobileViewport.value = window.innerWidth <= 1000
  if (!isMobileViewport.value) {
    isSheetExpanded.value = false
    return
  }
}

function severityLabel(value) {
  if (value === 'extreme') return 'Extreme'
  if (value === 'high') return 'High'
  if (value === 'moderate') return 'Moderate'
  return 'Low'
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

function formatRelativeTime(date) {
  const ts = date instanceof Date ? date.getTime() : Date.parse(date || '')
  if (!Number.isFinite(ts)) return 'Unknown'
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function formatUpdatedTime(value) {
  const ts = Date.parse(value || '')
  if (Number.isNaN(ts)) return 'Time unknown'
  return new Date(ts).toLocaleString()
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

function resolveHazardCategory(hazard) {
  if (hazard?.type === 'other') return 'Other'
  return formatCategoryLabel(hazard?.riskCategory || hazard?.category || '')
}

function resolveHazardVisual(hazard) {
  return hazardMeta[hazard?.type] || hazardMeta.other
}

function getMarkerRadius(severity) {
  if (severity === 'extreme') return 11
  if (severity === 'high') return 9
  if (severity === 'moderate') return 7
  return 6
}

function zoneOpacitiesBySeverity(severity) {
  if (severity === 'extreme') return { l1: 0.3, l2: 0.18, l3: 0.1 }
  if (severity === 'high') return { l1: 0.24, l2: 0.14, l3: 0.08 }
  if (severity === 'moderate') return { l1: 0.18, l2: 0.1, l3: 0.06 }
  return { l1: 0.14, l2: 0.08, l3: 0.05 }
}

function drawSelectedPoint() {
  if (!selectedPointLayer) return
  selectedPointLayer.clearLayers()
  if (!selectedPoint.value) return

  L.marker([selectedPoint.value.lat, selectedPoint.value.lng], {
    icon: L.divIcon({
      className: 'planner-anchor-icon',
      html: '<div class="planner-anchor planner-anchor--report">R</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  })
    .bindPopup('Selected report point')
    .addTo(selectedPointLayer)
}

function drawHazards() {
  if (!hazardLayer) return
  hazardLayer.clearLayers()

  hazards.value.forEach((hazard) => {
    if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return
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
      }).addTo(hazardLayer)
    })

    const hazardMarker = L.circleMarker(hazard.coordinates, {
      radius: getMarkerRadius(hazard.severity),
      color: meta.color,
      fillColor: meta.color,
      fillOpacity: 0.86,
      weight: 2,
      bubblingMouseEvents: false,
    })

    hazardMarker
      .bindPopup(
        `
        <div style="min-width: 200px;">
          <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(hazard.title)}</div>
          <div style="font-size: 12px; margin-bottom: 8px;">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
          <div style="font-size: 11px; color: #5f6b66;">
            ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel(hazard.severity) || 'Unknown')}<br />
            Category: ${escapeHtml(resolveHazardCategory(hazard))}<br />
            Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br />
            Source: ${escapeHtml(hazard.source)}
          </div>
        </div>
      `
      )
      .addTo(hazardLayer)

    hazardMarker.on('click', (event) => {
      L.DomEvent.stopPropagation(event)
    })
  })
}

function drawReports() {
  if (!reportLayer) return
  reportLayer.clearLayers()

  sortedReports.value.forEach((report) => {
    if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) return
    const meta = hazardMeta[report.hazardType] || hazardMeta.other

    const reportMarker = L.marker([report.latitude, report.longitude], {
      icon: L.divIcon({
        className: 'community-report-pin',
        html: `<div class="community-report-pin__dot" style="background:${meta.color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
      bubblingMouseEvents: false,
    })

    reportMarker
      .bindPopup(
        `<strong>${report.title}</strong><br/>${meta.label} · ${severityLabel(report.severity)}<br/>${report.locationName}<br/>${report.description}`
      )
      .addTo(reportLayer)

    reportMarker.on('click', (event) => {
      L.DomEvent.stopPropagation(event)
    })
  })
}

async function loadHazards() {
  if (!mapInstance) return
  if (inflightHazardController) inflightHazardController.abort()
  inflightHazardController = new AbortController()

  try {
    const payload = await fetchRealtimeHazards({
      bbox: getMapBboxWithinVictoria(mapInstance),
      layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
      signal: inflightHazardController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        hazards.value = freshPayload.hazards
      },
    })
    hazards.value = payload.hazards
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    console.error('Failed to load map hazards:', nextError)
  }
}

async function loadReports() {
  if (inflightReportController) inflightReportController.abort()
  inflightReportController = new AbortController()
  loading.value = true
  error.value = ''

  try {
    const payload = await fetchCommunityReports({
      limit: 100,
      signal: inflightReportController.signal,
      preferCache: true,
      onUpdate: (freshPayload) => {
        reports.value = freshPayload.reports
        storageMode.value = freshPayload.storage
        fetchedAt.value = freshPayload.fetchedAt || freshPayload.cachedAt || new Date()
      },
    })
    reports.value = payload.reports
    storageMode.value = payload.storage
    fetchedAt.value = payload.fetchedAt || payload.cachedAt || new Date()
  } catch (nextError) {
    if (nextError?.name === 'AbortError') return
    error.value = nextError?.message || 'Failed to fetch community reports'
  } finally {
    loading.value = false
  }
}

function applyPickedLocation({ lat, lng, displayName, flyZoom } = {}) {
  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false

  if (!isLatLngInVictoria({ lat: latNum, lng: lngNum })) {
    submitError.value = 'Report locations must be within Victoria.'
    return false
  }

  selectedPoint.value = {
    lat: Number(latNum.toFixed(6)),
    lng: Number(lngNum.toFixed(6)),
  }
  submitError.value = ''

  const trimmedName = String(displayName || '').trim()
  if (trimmedName && !form.locationName.trim()) {
    form.locationName = trimmedName
  }

  if (mapInstance) {
    const zoom = Math.max(mapInstance.getZoom(), flyZoom ?? 13)
    mapInstance.flyTo([latNum, lngNum], zoom, { duration: 0.45 })
  }

  if (isMobileViewport.value) {
    isSheetExpanded.value = true
    activeMobileTab.value = 'submit'
  }

  return true
}

async function reverseFillLocationName({ lat, lng }) {
  if (reverseLookupController) reverseLookupController.abort()
  reverseLookupController = new AbortController()
  try {
    const result = await reverseLocation(lat, lng, {
      signal: reverseLookupController.signal,
    })
    if (result?.displayName && !form.locationName.trim()) {
      form.locationName = result.displayName
    }
  } catch (_error) {
    /* silent — reverse lookup is best-effort */
  }
}

async function useMyLocation() {
  submitError.value = ''
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    submitError.value = 'Geolocation is not available in this browser.'
    return
  }

  const attempts = [
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: Infinity },
  ]

  locatingMe.value = true
  let lastError = null
  try {
    let position = null
    for (let i = 0; i < attempts.length; i += 1) {
      try {
        position = await requestCurrentPosition(attempts[i])
        break
      } catch (err) {
        lastError = err
        if (err?.code === 1) throw err
        if (i < attempts.length - 1) {
          await delay(600)
        }
      }
    }
    if (!position) throw lastError || new Error('geolocation_failed')
    const { latitude, longitude } = position.coords
    const applied = applyPickedLocation({ lat: latitude, lng: longitude, flyZoom: 14 })
    if (applied) {
      await reverseFillLocationName({ lat: latitude, lng: longitude })
    }
  } catch (error) {
    submitError.value = getGeolocationErrorMessage(error)
  } finally {
    locatingMe.value = false
  }
}

async function searchAddress(value) {
  const text = String(value ?? addressQuery.value ?? '').trim()
  addressQuery.value = value ?? addressQuery.value

  if (addressSearchController) addressSearchController.abort()

  if (text.length < 2) {
    addressSuggestions.value = []
    searchingAddress.value = false
    return
  }

  addressSearchController = new AbortController()
  searchingAddress.value = true
  try {
    const results = await searchLocations(text, {
      signal: addressSearchController.signal,
      limit: 6,
    })
    addressSuggestions.value = results
  } catch (error) {
    if (error?.name === 'AbortError') return
    addressSuggestions.value = []
  } finally {
    searchingAddress.value = false
  }
}

function applyAddressSuggestion(item) {
  const applied = applyPickedLocation({
    lat: item.lat,
    lng: item.lng,
    displayName: item.displayName,
    flyZoom: 13,
  })
  if (applied) {
    addressQuery.value = item.displayName
    addressSuggestions.value = []
  }
}

function clearAddressSearch() {
  addressQuery.value = ''
  addressSuggestions.value = []
  if (addressSearchController) addressSearchController.abort()
}

function validateForm() {
  if (!selectedPoint.value) return 'Please pick a location on the map first'
  if (!form.title.trim()) return 'Title is required'
  if (!form.description.trim()) return 'Description is required'
  if (!form.locationName.trim()) return 'Location name is required'
  return ''
}

async function onImageFileSelected(event) {
  const target = event?.target
  const file = target?.files?.[0]
  if (!file) return

  imageError.value = ''
  imageUploading.value = true
  try {
    const { dataUrl, width, height } = await fileToThumbnail(file)
    imagePreviewUrl.value = dataUrl
    const uploaded = await uploadCommunityReportImage({ dataUrl, width, height })
    form.imageUrl = uploaded.url
  } catch (error) {
    imageError.value = error?.message || 'Failed to upload image'
    imagePreviewUrl.value = ''
    form.imageUrl = ''
  } finally {
    imageUploading.value = false
    if (target) target.value = ''
  }
}

function clearImageAttachment() {
  imageError.value = ''
  imagePreviewUrl.value = ''
  form.imageUrl = ''
  if (imageFileInput.value) imageFileInput.value.value = ''
}

async function handleSubmit() {
  submitError.value = ''
  submitSuccess.value = ''
  const validationError = validateForm()
  if (validationError) {
    submitError.value = validationError
    return
  }

  // First time submitting in this session, ask whether the situation is an
  // emergency before posting the report. If the user picks "No", the modal's
  // dismiss handler runs the actual submission.
  if (!emergencyAlreadyAcked()) {
    pendingSubmitAfterEmergency = performSubmit
    showEmergencyModal.value = true
    return
  }

  await performSubmit()
}

async function performSubmit() {
  submitError.value = ''
  submitSuccess.value = ''
  submitLoading.value = true

  try {
    await submitCommunityReport({
      title: form.title.trim(),
      description: form.description.trim(),
      locationName: form.locationName.trim(),
      hazardType: form.hazardType,
      severity: form.severity,
      latitude: selectedPoint.value.lat,
      longitude: selectedPoint.value.lng,
      reporterName: form.reporterName.trim() || 'Anonymous Hiker',
      imageUrl: form.imageUrl.trim(),
    })

    submitSuccess.value = 'Report submitted successfully.'
    isSheetExpanded.value = true
    activeMobileTab.value = 'feed'
    form.title = ''
    form.description = ''
    form.locationName = ''
    form.reporterName = ''
    form.imageUrl = ''
    imagePreviewUrl.value = ''
    imageError.value = ''
    if (imageFileInput.value) imageFileInput.value.value = ''
    await loadReports()
  } catch (nextError) {
    submitError.value = nextError?.message || 'Failed to submit report'
  } finally {
    submitLoading.value = false
  }
}

function toggleSheet() {
  isSheetExpanded.value = !isSheetExpanded.value
}

onMounted(async () => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode)

  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    attributionControl: true,
    fadeAnimation: false,
    markerZoomAnimation: false,
    zoomAnimation: false,
  }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { animate: false })
  applyVictoriaMapConstraints(mapInstance)

  mapInstance.attributionControl.setPrefix(false)
  L.control.zoom({ position: isMobileViewport.value ? 'topright' : 'bottomright' }).addTo(mapInstance)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance)

  hazardLayer = L.layerGroup().addTo(mapInstance)
  reportLayer = L.layerGroup().addTo(mapInstance)
  selectedPointLayer = L.layerGroup().addTo(mapInstance)

  mapInstance.on('click', async (event) => {
    const applied = applyPickedLocation({
      lat: event.latlng.lat,
      lng: event.latlng.lng,
    })
    if (applied) {
      await reverseFillLocationName({ lat: event.latlng.lat, lng: event.latlng.lng })
    }
  })

  mapInstance.on('moveend', loadHazards)

  await Promise.all([loadHazards(), loadReports()])
  refreshTimer = window.setInterval(() => {
    loadHazards()
    loadReports()
  }, 60000)
})

watch(hazards, drawHazards, { deep: true })
watch(sortedReports, drawReports, { deep: true })
watch(selectedPoint, drawSelectedPoint, { deep: true })

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportMode)
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (inflightReportController) inflightReportController.abort()
  if (inflightHazardController) inflightHazardController.abort()
  if (addressSearchController) addressSearchController.abort()
  if (reverseLookupController) reverseLookupController.abort()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <main class="community-layout">
    <div
      v-if="showEmergencyModal"
      class="emergency-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
    >
      <div class="emergency-modal__backdrop" @click="dismissEmergencyModal"></div>
      <div class="emergency-modal__card">
        <span class="material-symbols-outlined emergency-modal__icon">emergency</span>
        <h2 id="emergency-modal-title">Is this an emergency?</h2>
        <p class="emergency-modal__body">
          If life or property is in immediate danger, please call <strong>000</strong> right now.
          Otherwise you can continue and submit a community report.
        </p>
        <div class="emergency-modal__actions">
          <button type="button" class="emergency-modal__call" @click="confirmEmergencyAndCall">
            Yes — call 000
          </button>
          <button type="button" class="emergency-modal__continue" @click="dismissEmergencyModal">
            No — continue reporting
          </button>
        </div>
        <p class="emergency-modal__footnote">
          000 is Australia's national emergency number for police, fire, and ambulance.
        </p>
      </div>
    </div>

    <aside class="community-panel mobile-sheet" :class="{ 'mobile-sheet--expanded': isSheetExpanded }">
      <div class="mobile-sheet__handle"></div>
      <div class="community-mobile-actions">
        <button class="mobile-sheet-toggle" @click="toggleSheet">
          <span class="material-symbols-outlined text-[18px]">{{ isSheetExpanded ? 'expand_more' : 'expand_less' }}</span>
          {{ isSheetExpanded ? 'Show Less' : 'Open Community Panel' }}
        </button>
      </div>
      <div class="mobile-sheet__body community-panel__body">
      <div>
        <p class="community-kicker">Community Intelligence + Official Risk Layer</p>
        <h1>Community Reports</h1>
        <p class="community-sub">Pick location on map, fill report on left, submit in same page.</p>
      </div>

      <section class="community-mobile-summary" v-if="isMobileViewport">
        <article>
          <span>Reports</span>
          <strong>{{ stats.total }}</strong>
        </article>
        <article>
          <span>Point</span>
          <strong>{{ selectedPoint ? 'Selected' : 'Tap map' }}</strong>
        </article>
        <article>
          <span>Sync</span>
          <strong>{{ fetchedAt ? fetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' }}</strong>
        </article>
      </section>

      <div class="community-mobile-tabs" v-if="isMobileViewport">
        <button
          class="community-mobile-tab"
          :class="{ 'community-mobile-tab--active': activeMobileTab === 'submit' }"
          @click="activeMobileTab = 'submit'"
        >
          Submit
        </button>
        <button
          class="community-mobile-tab"
          :class="{ 'community-mobile-tab--active': activeMobileTab === 'feed' }"
          @click="activeMobileTab = 'feed'"
        >
          Feed
        </button>
      </div>

      <section class="community-form" v-show="!isMobileViewport || activeMobileTab === 'submit'">
        <div class="location-picker">
          <p class="location-picker__title">Pick Report Location</p>
          <p class="location-picker__hint">
            Use your current GPS, search an address, or click the map.
          </p>

          <div class="location-picker__row">
            <button
              type="button"
              class="locate-btn"
              :disabled="locatingMe"
              @click="useMyLocation"
            >
              <span class="material-symbols-outlined text-[18px]">my_location</span>
              {{ locatingMe ? 'Locating...' : 'Use My Location' }}
            </button>

            <div class="address-field">
              <input
                class="field-input"
                type="text"
                placeholder="Search address, suburb or track"
                :value="addressQuery"
                @input="searchAddress($event.target.value)"
              />
              <button
                v-if="addressQuery"
                type="button"
                class="address-field__clear"
                aria-label="Clear search"
                @click="clearAddressSearch"
              >
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
              <div
                v-if="addressSuggestions.length || searchingAddress"
                class="address-suggestions"
              >
                <p v-if="searchingAddress && !addressSuggestions.length" class="address-suggestions__empty">
                  Searching...
                </p>
                <button
                  v-for="item in addressSuggestions"
                  :key="`addr-${item.lat}-${item.lng}`"
                  type="button"
                  class="address-suggestion"
                  @click="applyAddressSuggestion(item)"
                >
                  {{ item.displayName }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="point-card">
          <p>Selected Map Point</p>
          <strong>{{ selectedPointLabel }}</strong>
        </div>

        <input v-model="form.title" class="field-input" type="text" placeholder="Report title" />
        <textarea v-model="form.description" class="field-input" rows="3" placeholder="Describe what you observed"></textarea>
        <input v-model="form.locationName" class="field-input" type="text" placeholder="Location name (track / park)" />

        <div class="field-row">
          <select v-model="form.hazardType" class="field-input">
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="storm">Storm / Mud</option>
            <option value="trail">Trail Obstacle</option>
            <option value="other">Other</option>
          </select>
          <select v-model="form.severity" class="field-input">
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="extreme">Extreme</option>
          </select>
        </div>

        <div class="field-row">
          <input v-model="form.reporterName" class="field-input" type="text" placeholder="Reporter name (optional)" />
        </div>

        <div class="image-upload">
          <p class="image-upload__title">Photo (optional)</p>
          <p class="image-upload__hint">
            Attach a photo or take one on mobile.
          </p>
          <div class="image-upload__row">
            <input
              ref="imageFileInput"
              type="file"
              accept="image/*"
              capture="environment"
              class="image-upload__input"
              :disabled="imageUploading"
              @change="onImageFileSelected"
            />
            <button
              v-if="imagePreviewUrl || form.imageUrl"
              type="button"
              class="image-upload__clear"
              :disabled="imageUploading"
              @click="clearImageAttachment"
            >
              Remove
            </button>
          </div>
          <p v-if="imageUploading" class="image-upload__status">Uploading thumbnail...</p>
          <p v-if="imageError" class="error-text">{{ imageError }}</p>
          <div v-if="imagePreviewUrl" class="image-upload__preview">
            <img :src="imagePreviewUrl" alt="Selected report photo preview" />
          </div>
        </div>

        <button class="primary-btn" :disabled="submitLoading" @click="handleSubmit">
          {{ submitLoading ? 'Submitting...' : 'Submit Report' }}
        </button>
        <p v-if="submitError" class="error-text">{{ submitError }}</p>
        <p v-if="submitSuccess" class="ok-text">{{ submitSuccess }}</p>
        <p v-if="error" class="error-text">{{ error }}</p>
      </section>

      <section class="summary-card">
        <p class="summary-title">Live Summary</p>
        <p>{{ stats.total }} reports · E {{ stats.extreme }} · H {{ stats.high }} · M {{ stats.moderate }} · L {{ stats.low }}</p>
        <p>Storage: {{ storageMode === 'database' ? 'Railway DB' : 'Fallback' }}</p>
        <p>Last sync: {{ fetchedAt ? fetchedAt.toLocaleTimeString() : '—' }}</p>
      </section>

      <section class="feed-card" v-show="!isMobileViewport || activeMobileTab === 'feed'">
        <p class="summary-title">Latest Reports</p>
        <p v-if="loading && !sortedReports.length" class="muted">Loading reports...</p>
        <div v-for="report in sortedReports.slice(0, 8)" :key="report.id" class="feed-item">
          <div class="feed-title-row">
            <strong>{{ report.title }}</strong>
            <span>{{ severityLabel(report.severity) }}</span>
          </div>
          <p>{{ report.locationName }} · {{ formatRelativeTime(report.reportedAt) }}</p>
        </div>
      </section>
      </div>
    </aside>

    <section class="community-map-wrap">
      <div ref="mapElement" class="community-map"></div>
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
.community-layout {
  display: grid;
  grid-template-columns: 410px 1fr;
  height: calc(100vh - 72px);
  height: var(--mobile-safe-height);
  background:
    radial-gradient(circle at 0% 0%, rgba(143, 174, 131, 0.24), transparent 26rem),
    linear-gradient(130deg, #fffaf2 0%, #f2eee5 48%, #e7eee4 100%);
  position: relative;
}

.community-panel {
  --mobile-sheet-peek: 168px;
  border-right: 1px solid rgba(33, 72, 59, 0.14);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  overflow: auto;
  background: rgba(255, 250, 242, 0.86);
  backdrop-filter: blur(18px);
}

.community-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.community-mobile-actions {
  display: none;
}

.community-mobile-summary,
.community-mobile-tabs {
  display: none;
}

.community-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 900;
  color: #6f897b;
}

h1 {
  margin: 0.25rem 0;
  font-size: 2.1rem;
  line-height: 1;
  font-weight: 700;
  color: #173b31;
}

.community-sub {
  margin: 0;
  font-size: 0.88rem;
  color: #3b5358;
}

.community-form,
.summary-card,
.feed-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.95rem;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.012), 0 2px 8px rgba(0,0,0,0.03), 0 10px 24px rgba(25,56,45,0.05);
}

.location-picker {
  background: linear-gradient(180deg, #fffaf2 0%, #f3f8ee 100%);
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 1rem;
  padding: 0.8rem 0.85rem 0.9rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.location-picker__title {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  color: #1f6e57;
}

.location-picker__hint {
  margin: 0;
  font-size: 0.78rem;
  color: #4c6b63;
  line-height: 1.4;
}

.location-picker__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: start;
}

.locate-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(33, 72, 59, 0.22);
  background: #fff;
  color: #21483b;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.locate-btn:hover:not(:disabled) {
  background: #e9f5ee;
  border-color: #1f6e57;
}

.locate-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.address-field {
  position: relative;
  min-width: 0;
}

.address-field .field-input {
  padding-right: 2.1rem;
}

.address-field__clear {
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6c7e7a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 6px;
}

.address-field__clear:hover {
  color: #1f6e57;
  background: rgba(31, 111, 87, 0.08);
}

.address-suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  background: #fff;
  border: 1px solid rgba(15, 40, 45, 0.12);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(15, 40, 45, 0.12);
  max-height: 240px;
  overflow-y: auto;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.address-suggestions__empty {
  margin: 0;
  padding: 0.5rem 0.65rem;
  font-size: 0.8rem;
  color: #6c7e7a;
}

.address-suggestion {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border: none;
  background: none;
  color: #1a3530;
  font-size: 0.82rem;
  line-height: 1.3;
  border-radius: 8px;
  cursor: pointer;
}

.address-suggestion:hover {
  background: #eef6f1;
  color: #1f6e57;
}

.point-card {
  background: #f3f8ee;
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 0.9rem;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.7rem;
}

.point-card p {
  margin: 0;
  font-size: 0.72rem;
  color: #47646b;
}

.point-card strong {
  font-size: 0.8rem;
  color: #123b3e;
}

.field-input {
  width: 100%;
  border: 1px solid rgba(33, 72, 59, 0.14);
  border-radius: 0.85rem;
  padding: 0.68rem 0.78rem;
  font-size: 0.85rem;
  margin-bottom: 0.55rem;
  background: #fffaf2;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.primary-btn {
  width: 100%;
  margin-top: 0.2rem;
  border: none;
  border-radius: 999px;
  padding: 0.82rem 1rem;
  font-weight: 800;
  color: #fffaf2;
  background: linear-gradient(135deg, #173b31 0%, #2f604e 68%, #7f9b75 100%);
  box-shadow: 0 14px 30px rgba(23, 59, 49, 0.2);
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-title {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
  color: #1f6e57;
}

.summary-card p {
  margin: 0.18rem 0;
  font-size: 0.8rem;
  color: #284950;
}

.feed-item {
  border: 1px solid rgba(33, 72, 59, 0.1);
  border-radius: 0.85rem;
  padding: 0.65rem;
  margin-top: 0.5rem;
  background: #fffaf2;
}

.feed-title-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.feed-title-row strong {
  font-size: 0.82rem;
  color: #123b3e;
}

.feed-title-row span,
.feed-item p,
.muted {
  font-size: 0.74rem;
  color: #4e6970;
  margin: 0.15rem 0 0;
}

.error-text {
  margin: 0.35rem 0 0;
  font-size: 0.76rem;
  color: #b42318;
}

.ok-text {
  margin: 0.35rem 0 0;
  font-size: 0.76rem;
  color: #0f7b6c;
}

.image-upload {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem 0.8rem;
  border-radius: 0.85rem;
  border: 1px dashed rgba(33, 72, 59, 0.22);
  background: rgba(255, 255, 255, 0.6);
}

.image-upload__title {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  color: #1f6e57;
}

.image-upload__hint {
  margin: 0;
  font-size: 0.74rem;
  color: #4c6b63;
  line-height: 1.4;
}

.image-upload__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.image-upload__input {
  flex: 1 1 auto;
  font-size: 0.78rem;
  color: #173b31;
}

.image-upload__clear {
  border: 1px solid rgba(33, 72, 59, 0.18);
  background: rgba(255, 255, 255, 0.9);
  color: #173b31;
  font-size: 0.74rem;
  padding: 0.35rem 0.6rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.image-upload__clear:hover:not([disabled]) {
  background: #fff;
}

.image-upload__status {
  margin: 0.1rem 0 0;
  font-size: 0.74rem;
  color: #6f897b;
}

.image-upload__preview {
  margin-top: 0.3rem;
  border-radius: 0.6rem;
  overflow: hidden;
  border: 1px solid rgba(33, 72, 59, 0.14);
  max-width: 220px;
}

.image-upload__preview img {
  display: block;
  width: 100%;
  height: auto;
}

.emergency-modal {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.emergency-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 28, 0.55);
  backdrop-filter: blur(4px);
}

.emergency-modal__card {
  position: relative;
  z-index: 1;
  max-width: 420px;
  width: 100%;
  background: #fffaf2;
  border-radius: 1.1rem;
  padding: 1.4rem 1.3rem 1.2rem;
  box-shadow: 0 24px 60px rgba(15, 23, 28, 0.35);
  border: 1px solid rgba(216, 71, 39, 0.28);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  text-align: left;
}

.emergency-modal__icon {
  font-size: 2rem !important;
  color: #d84727;
}

.emergency-modal__card h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #173b31;
}

.emergency-modal__body {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: #3b5358;
}

.emergency-modal__body strong {
  color: #d84727;
}

.emergency-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.emergency-modal__call,
.emergency-modal__continue {
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-radius: 0.65rem;
  cursor: pointer;
}

.emergency-modal__call {
  background: #d84727;
  color: #fff;
  box-shadow: 0 8px 18px rgba(216, 71, 39, 0.32);
}

.emergency-modal__call:hover {
  background: #b8391e;
}

.emergency-modal__continue {
  background: rgba(33, 72, 59, 0.08);
  color: #173b31;
}

.emergency-modal__continue:hover {
  background: rgba(33, 72, 59, 0.16);
}

.emergency-modal__footnote {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: #6f897b;
  line-height: 1.4;
}

.community-map-wrap {
  position: relative;
  min-height: 0;
  padding: 0.85rem;
  background: #dfe8dd;
}

.community-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 1.15rem;
  box-shadow: inset 0 0 0 1px rgba(33, 72, 59, 0.08), 0 20px 60px rgba(23, 59, 49, 0.12);
}

.legend-overlay {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 500;
  background: rgba(255, 250, 242, 0.94);
  border: 1px solid rgba(33, 72, 59, 0.12);
  border-radius: 1rem;
  padding: 0.7rem;
  box-shadow: 0 14px 30px rgba(23, 59, 49, 0.14);
}

.legend-overlay p {
  margin: 0 0 0.45rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #1f6e57;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  font-size: 0.75rem;
  color: #2a4b52;
  margin-top: 0.3rem;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.2rem 0.8rem;
}

.legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

:deep(.planner-anchor) {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background: #1f6e57;
}

:deep(.community-report-pin__dot) {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}

@media (max-width: 1000px) {
  .location-picker__row {
    grid-template-columns: 1fr;
  }

  .locate-btn {
    width: 100%;
    justify-content: center;
  }

  .community-layout {
    grid-template-columns: 1fr;
    min-height: var(--mobile-safe-height);
  }

  .community-map-wrap {
    min-height: var(--mobile-safe-height);
  }

  .community-panel {
    border-right: 0;
    border-top: 1px solid rgba(33, 72, 59, 0.14);
    padding: 0 1rem 1rem;
    background: rgba(255, 250, 242, 0.97);
  }

  .community-mobile-actions {
    display: flex;
    justify-content: center;
    padding-bottom: 0.4rem;
  }

  .community-mobile-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .community-mobile-summary article {
    border: 1px solid #dde7e7;
    border-radius: 0.8rem;
    padding: 0.55rem 0.6rem;
    background: #fbfefd;
  }

  .community-mobile-summary span {
    display: block;
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #55716b;
    font-weight: 800;
  }

  .community-mobile-summary strong {
    display: block;
    margin-top: 0.18rem;
    font-size: 0.88rem;
    color: #173a34;
  }

  .community-mobile-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }

  .community-mobile-tab {
    border: 1px solid #d9e5e5;
    border-radius: 999px;
    background: #f8fbfb;
    padding: 0.62rem 0.78rem;
    font-size: 0.8rem;
    font-weight: 800;
    color: #35524d;
  }

  .community-mobile-tab--active {
    background: #21493f;
    border-color: #21493f;
    color: #fff;
  }

  .legend-overlay {
    top: 0.8rem;
    left: 0.8rem;
    right: auto;
    max-width: min(210px, calc(100vw - 1.6rem));
    padding: 0.55rem 0.65rem;
  }

  .legend-overlay p {
    margin-bottom: 0.3rem;
    font-size: 0.68rem;
  }

  .legend-item {
    margin-top: 0.12rem;
    font-size: 0.69rem;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
