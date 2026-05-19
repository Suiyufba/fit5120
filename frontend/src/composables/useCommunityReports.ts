import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
// @ts-ignore — @types/leaflet not installed
import * as L from 'leaflet'
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
import {
  createLeafletBaseLayer,
  DEFAULT_MAP_VISUAL_STYLE,
  MAP_VISUAL_STYLES,
} from '../utils/mapVisualStyles'

// ── Constants ──────────────────────────────────────────

const EMERGENCY_DISMISSED_KEY = 'hikeshield_emergency_modal_ack_v1'
const THUMBNAIL_MAX_DIMENSION = 480
const THUMBNAIL_MIME = 'image/jpeg'
const THUMBNAIL_QUALITY = 0.78
const THUMBNAIL_MAX_FILE_BYTES = 8 * 1024 * 1024
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 300000,
}

export const hazardMeta: Record<string, { label: string; color: string; icon: string }> = {
  fire: { label: 'Bushfire', color: '#D84727', icon: 'local_fire_department' },
  flood: { label: 'Flood', color: '#2165B5', icon: 'flood' },
  storm: { label: 'Storm', color: '#5A4B81', icon: 'rainy' },
  heat: { label: 'Heat', color: '#D08817', icon: 'thermostat' },
  trail: { label: 'Trail', color: '#6B5C4F', icon: 'warning' },
  other: { label: 'Other', color: '#2E7D6B', icon: 'campaign' },
}

export const severityRank: Record<string, number> = { extreme: 4, high: 3, moderate: 2, low: 1 }

// ── Utility functions ──────────────────────────────────

export function getGeolocationErrorMessage(error: GeolocationPositionError | null): string {
  if (error?.code === 1) return 'Location permission denied. Enable location access or use address search.'
  if (error?.code === 2) return 'Your device could not determine its location. Open System Settings → Privacy & Security → Location Services, ensure Chrome is allowed, then retry — or pick a spot via address search or by clicking the map.'
  if (error?.code === 3) return 'Location lookup timed out. Try again near a window, or use address search / click the map.'
  return 'Could not determine your location. Try address search or click on the map instead.'
}

function getCurrentBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS)
  })
}

export function escapeHtml(value = ''): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function cleanPopupDescription(value = ''): string {
  return String(value).replace(/<br\s*\/?>/gi, ' ').replace(/<\/?strong>/gi, ' ').replace(/\s{2,}/g, ' ').trim()
}

export function formatRelativeTime(date: string | Date): string {
  const ts = date instanceof Date ? date.getTime() : Date.parse(date || '')
  if (!Number.isFinite(ts)) return 'Unknown'
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function formatUpdatedTime(value: string): string {
  const ts = Date.parse(value || '')
  if (Number.isNaN(ts)) return 'Time unknown'
  return new Date(ts).toLocaleString()
}

export function severityLabel(value: string): string {
  if (value === 'extreme') return 'Extreme'
  if (value === 'high') return 'High'
  if (value === 'moderate') return 'Moderate'
  return 'Low'
}

// ── Composable ─────────────────────────────────────────

export function useCommunityReports() {
  const mapElement: Ref<HTMLElement | null> = ref(null)

  // State
  const reports = ref<any[]>([])
  const hazards = ref<any[]>([])
  const fetchedAt = ref<Date | null>(null)
  const storageMode = ref('unknown')
  const loading = ref(false)
  const submitLoading = ref(false)
  const error = ref('')
  const submitError = ref('')
  const submitSuccess = ref('')

  const selectedPoint = ref<{ lat: number; lng: number } | null>(null)
  const isSheetExpanded = ref(false)
  const activeMobileTab = ref('submit')
  const isMobileViewport = ref(false)
  const selectedMapStyle = ref(DEFAULT_MAP_VISUAL_STYLE)
  const isMapLocatingUser = ref(false)
  const isViewingUserLocation = ref(false)

  const addressQuery = ref('')
  const addressSuggestions = ref<any[]>([])
  const locatingMe = ref(false)
  const searchingAddress = ref(false)
  const showEmergencyModal = ref(false)
  const imageUploading = ref(false)
  const imagePreviewUrl = ref('')
  const imageError = ref('')
  const imageFileInput = ref<HTMLInputElement | null>(null)

  let addressSearchController: AbortController | null = null
  let reverseLookupController: AbortController | null = null

  const form = reactive({
    title: '',
    description: '',
    locationName: '',
    hazardType: 'trail',
    severity: 'moderate',
    reporterName: '',
    imageUrl: '',
  })

  // Map internals
  let mapInstance: L.Map | null = null
  let baseTileLayer: L.TileLayer | null = null
  let hazardLayer: L.LayerGroup | null = null
  let reportLayer: L.LayerGroup | null = null
  let selectedPointLayer: L.LayerGroup | null = null
  let userLocationLayer: L.LayerGroup | null = null
  let inflightReportController: AbortController | null = null
  let inflightHazardController: AbortController | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let pendingSubmitAfterEmergency: (() => void) | null = null

  // Computed
  const sortedReports = computed(() =>
    reports.value.slice().sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)),
  )

  const stats = computed(() => {
    const summary = { total: sortedReports.value.length, extreme: 0, high: 0, moderate: 0, low: 0 }
    sortedReports.value.forEach((item: any) => {
      if (summary[item.severity as keyof typeof summary] !== undefined) {
        summary[item.severity as keyof typeof summary] += 1
      }
    })
    return summary
  })

  const selectedPointLabel = computed(() =>
    selectedPoint.value ? `${selectedPoint.value.lat}, ${selectedPoint.value.lng}` : 'Click the map to select report location',
  )

  // ── Image helpers ────────────────────────────────────

  function loadImageFromBlob(blob: Blob): Promise<{ image: HTMLImageElement; objectUrl: string }> {
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

  async function fileToThumbnail(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
    if (!file) throw new Error('No file selected')
    if (!file.type?.startsWith('image/')) throw new Error('File must be an image')
    if (file.size > THUMBNAIL_MAX_FILE_BYTES) throw new Error('Image is too large. Pick a file under 8MB.')

    const { image, objectUrl } = await loadImageFromBlob(file)
    try {
      const ratio = Math.min(1, THUMBNAIL_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
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

  async function onImageFileSelected(event: Event): Promise<void> {
    const target = event?.target as HTMLInputElement | null
    const file = target?.files?.[0]
    if (!file) return

    imageError.value = ''
    imageUploading.value = true
    try {
      const { dataUrl, width, height } = await fileToThumbnail(file)
      imagePreviewUrl.value = dataUrl
      const uploaded = await uploadCommunityReportImage({ dataUrl, width, height })
      form.imageUrl = uploaded.url
    } catch (err: any) {
      imageError.value = err?.message || 'Failed to upload image'
      imagePreviewUrl.value = ''
      form.imageUrl = ''
    } finally {
      imageUploading.value = false
      if (target) target.value = ''
    }
  }

  function clearImageAttachment(): void {
    imageError.value = ''
    imagePreviewUrl.value = ''
    form.imageUrl = ''
    if (imageFileInput.value) imageFileInput.value.value = ''
  }

  // ── Emergency modal ───────────────────────────────────

  function rememberEmergencyAck(): void {
    try { sessionStorage.setItem(EMERGENCY_DISMISSED_KEY, '1') } catch { /* unavailable */ }
  }
  function emergencyAlreadyAcked(): boolean {
    try { return sessionStorage.getItem(EMERGENCY_DISMISSED_KEY) === '1' } catch { return false }
  }
  function dismissEmergencyModal(): void {
    showEmergencyModal.value = false
    rememberEmergencyAck()
    if (typeof pendingSubmitAfterEmergency === 'function') {
      const next = pendingSubmitAfterEmergency
      pendingSubmitAfterEmergency = null
      next()
    }
  }
  function confirmEmergencyAndCall(): void {
    showEmergencyModal.value = false
    rememberEmergencyAck()
    pendingSubmitAfterEmergency = null
    if (typeof window !== 'undefined') window.location.href = 'tel:000'
  }

  // ── Location helpers ──────────────────────────────────

  function syncViewportMode(): void {
    if (typeof window === 'undefined') return
    isMobileViewport.value = window.innerWidth <= 1000
    if (!isMobileViewport.value) isSheetExpanded.value = false
  }

  function applyPickedLocation({ lat, lng, displayName, flyZoom }: {
    lat: number; lng: number; displayName?: string; flyZoom?: number
  }): boolean {
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false
    if (!isLatLngInVictoria({ lat: latNum, lng: lngNum })) {
      submitError.value = 'Report locations must be within Victoria.'
      return false
    }
    selectedPoint.value = { lat: Number(latNum.toFixed(6)), lng: Number(lngNum.toFixed(6)) }
    submitError.value = ''
    const trimmedName = String(displayName || '').trim()
    if (trimmedName && !form.locationName.trim()) form.locationName = trimmedName
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

  async function reverseFillLocationName({ lat, lng }: { lat: number; lng: number }): Promise<void> {
    if (reverseLookupController) reverseLookupController.abort()
    reverseLookupController = new AbortController()
    try {
      const result = await (reverseLocation as any)(lat, lng, { signal: reverseLookupController.signal })
      if (result?.displayName) {
        addressQuery.value = result.displayName
        addressSuggestions.value = []
        if (!form.locationName.trim()) form.locationName = result.displayName
      }
    } catch {
      addressQuery.value = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
      addressSuggestions.value = []
    }
  }

  async function useMyLocation(): Promise<void> {
    submitError.value = ''
    if (locatingMe.value) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      submitError.value = 'Geolocation is not available in this browser.'
      return
    }
    locatingMe.value = true
    try {
      const position = await getCurrentBrowserPosition()
      const { latitude, longitude } = position.coords
      const applied = applyPickedLocation({ lat: latitude, lng: longitude, flyZoom: 14 })
      if (applied) await reverseFillLocationName({ lat: latitude, lng: longitude })
    } catch (err: any) {
      submitError.value = getGeolocationErrorMessage(err)
    } finally {
      locatingMe.value = false
    }
  }

  async function searchAddress(value: string): Promise<void> {
    const text = String(value ?? addressQuery.value ?? '').trim()
    addressQuery.value = value ?? addressQuery.value
    if (addressSearchController) addressSearchController.abort()
    if (text.length < 2) { addressSuggestions.value = []; searchingAddress.value = false; return }
    addressSearchController = new AbortController()
    searchingAddress.value = true
    try {
      const results = await (searchLocations as any)(text, { signal: addressSearchController.signal, limit: 6 })
      addressSuggestions.value = results
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      addressSuggestions.value = []
    } finally {
      searchingAddress.value = false
    }
  }

  function applyAddressSuggestion(item: any): void {
    const applied = applyPickedLocation({ lat: item.lat, lng: item.lng, displayName: item.displayName, flyZoom: 13 })
    if (applied) { addressQuery.value = item.displayName; addressSuggestions.value = [] }
  }

  function clearAddressSearch(): void {
    addressQuery.value = ''
    addressSuggestions.value = []
    if (addressSearchController) addressSearchController.abort()
  }

  // ── Submit ────────────────────────────────────────────

  function validateForm(): string {
    if (!selectedPoint.value) return 'Please pick a location on the map first'
    if (!form.title.trim()) return 'Title is required'
    if (!form.description.trim()) return 'Description is required'
    if (!form.locationName.trim()) return 'Location name is required'
    return ''
  }

  async function performSubmit(): Promise<void> {
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
        latitude: selectedPoint.value!.lat,
        longitude: selectedPoint.value!.lng,
        reporterName: form.reporterName.trim() || 'Anonymous Hiker',
        imageUrl: form.imageUrl.trim(),
      })
      submitSuccess.value = 'Report submitted successfully.'
      isSheetExpanded.value = true
      activeMobileTab.value = 'feed'
      form.title = ''; form.description = ''; form.locationName = ''
      form.reporterName = ''; form.imageUrl = ''
      imagePreviewUrl.value = ''; imageError.value = ''
      if (imageFileInput.value) imageFileInput.value.value = ''
      await loadReports()
    } catch (err: any) {
      submitError.value = err?.message || 'Failed to submit report'
    } finally {
      submitLoading.value = false
    }
  }

  async function handleSubmit(): Promise<void> {
    submitError.value = ''
    submitSuccess.value = ''
    const validationError = validateForm()
    if (validationError) { submitError.value = validationError; return }
    if (!emergencyAlreadyAcked()) {
      pendingSubmitAfterEmergency = performSubmit
      showEmergencyModal.value = true
      return
    }
    await performSubmit()
  }

  // ── Data loading ──────────────────────────────────────

  async function loadHazards(): Promise<void> {
    if (!mapInstance) return
    if (inflightHazardController) inflightHazardController.abort()
    inflightHazardController = new AbortController()
    try {
      const payload = await (fetchRealtimeHazards as any)({
        bbox: getMapBboxWithinVictoria(mapInstance),
        layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'],
        signal: inflightHazardController.signal,
        preferCache: true,
        onUpdate: (freshPayload: any) => { hazards.value = freshPayload.hazards },
      })
      hazards.value = payload.hazards
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('Failed to load map hazards:', err)
    }
  }

  async function loadReports(): Promise<void> {
    if (inflightReportController) inflightReportController.abort()
    inflightReportController = new AbortController()
    loading.value = true; error.value = ''
    try {
      const payload = await (fetchCommunityReports as any)({
        limit: 100,
        signal: inflightReportController.signal,
        preferCache: true,
        onUpdate: (freshPayload: any) => {
          reports.value = freshPayload.reports
          storageMode.value = freshPayload.storage
          fetchedAt.value = freshPayload.fetchedAt || (freshPayload as any).cachedAt || new Date()
        },
      })
      reports.value = payload.reports
      storageMode.value = payload.storage
      fetchedAt.value = payload.fetchedAt || (payload as any).cachedAt || new Date()
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      error.value = err?.message || 'Failed to fetch community reports'
    } finally {
      loading.value = false
    }
  }

  // ── Map helpers ───────────────────────────────────────

  function switchMapStyle(styleId: string): void {
    if (!mapInstance || !(MAP_VISUAL_STYLES as any)[styleId] || selectedMapStyle.value === styleId) return
    selectedMapStyle.value = styleId
    if (baseTileLayer) mapInstance.removeLayer(baseTileLayer)
    baseTileLayer = createLeafletBaseLayer(L, styleId).addTo(mapInstance)
    hazardLayer?.bringToFront(); reportLayer?.bringToFront()
    selectedPointLayer?.bringToFront(); userLocationLayer?.bringToFront()
  }

  function recenterCommunityMap(): void {
    isViewingUserLocation.value = false
    mapInstance?.flyTo(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { duration: 0.55 })
  }

  function locateMapUser(): void {
    if (isViewingUserLocation.value) { recenterCommunityMap(); return }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      window.alert('Geolocation is not available in this browser.')
      return
    }
    if (isMapLocatingUser.value) return
    isMapLocatingUser.value = true
    getCurrentBrowserPosition()
      .then((position) => {
        const point = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: position.coords.accuracy,
        }
        if (!isLatLngInVictoria({ lat: point.lat, lng: point.lng })) {
          window.alert('Your current location is outside Victoria, so it cannot be shown on this map.')
          return
        }
        if (userLocationLayer) {
          userLocationLayer.clearLayers()
          L.circleMarker([point.lat, point.lng], {
            radius: 8, color: '#ffffff', fillColor: '#173b31', fillOpacity: 1, weight: 3,
          }).bindPopup('Your current location', { className: 'community-report-popup-shell' }).addTo(userLocationLayer)
          L.circle([point.lat, point.lng], {
            radius: Math.max(point.accuracy || 0, 80),
            color: '#173b31', fillColor: '#173b31', fillOpacity: 0.08, opacity: 0.24, weight: 1, interactive: false,
          }).addTo(userLocationLayer)
        }
        isViewingUserLocation.value = true
        mapInstance?.flyTo([point.lat, point.lng], Math.max(mapInstance.getZoom(), 13), { duration: 0.65 })
      })
      .catch((err: GeolocationPositionError) => {
        window.alert(getGeolocationErrorMessage(err))
      })
      .finally(() => {
        isMapLocatingUser.value = false
      })
  }

  // ── Lifecycle ─────────────────────────────────────────

  function initMap(container: HTMLElement): L.Map {
    mapInstance = L.map(container, {
      zoomControl: false, attributionControl: false,
      fadeAnimation: false, markerZoomAnimation: false, zoomAnimation: false,
    }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { animate: false })
    applyVictoriaMapConstraints(mapInstance)

    baseTileLayer = createLeafletBaseLayer(L, selectedMapStyle.value).addTo(mapInstance)
    hazardLayer = L.layerGroup().addTo(mapInstance)
    reportLayer = L.layerGroup().addTo(mapInstance)
    selectedPointLayer = L.layerGroup().addTo(mapInstance)
    userLocationLayer = L.layerGroup().addTo(mapInstance)

    mapInstance.on('click', async (event: L.LeafletMouseEvent) => {
      const applied = applyPickedLocation({ lat: event.latlng.lat, lng: event.latlng.lng })
      if (applied) await reverseFillLocationName({ lat: event.latlng.lat, lng: event.latlng.lng })
    })
    mapInstance.on('moveend', loadHazards)
    return mapInstance
  }

  function getMapInstance(): L.Map | null { return mapInstance }

  function drawHazards(): void {
    if (!hazardLayer) return
    hazardLayer.clearLayers()
    hazards.value.forEach((hazard: any) => {
      if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return
      const meta = hazardMeta[hazard.type] || hazardMeta.other
      const sev = hazard.severity || 'moderate'
      const opacities = sev === 'extreme' ? { l1: 0.3, l2: 0.18, l3: 0.1 }
        : sev === 'high' ? { l1: 0.24, l2: 0.14, l3: 0.08 }
        : sev === 'moderate' ? { l1: 0.18, l2: 0.1, l3: 0.06 }
        : { l1: 0.14, l2: 0.08, l3: 0.05 }

      ;[5000, 3000, 1000].forEach((radius, i) => {
        L.circle(hazard.coordinates, {
          radius, color: meta.color, fillColor: meta.color,
          fillOpacity: [opacities.l3, opacities.l2, opacities.l1][i],
          opacity: 0.45, weight: i === 2 ? 2 : 1, interactive: false,
        }).addTo(hazardLayer!)
      })

      const marker = L.circleMarker(hazard.coordinates, {
        radius: sev === 'extreme' ? 11 : sev === 'high' ? 9 : sev === 'moderate' ? 7 : 6,
        color: meta.color, fillColor: meta.color, fillOpacity: 0.86, weight: 2, bubblingMouseEvents: false,
      })
      marker.bindPopup(`
        <div style="min-width:200px">
          <div style="font-weight:800;margin-bottom:6px">${escapeHtml(hazard.title)}</div>
          <div style="font-size:12px;margin-bottom:8px">${escapeHtml(cleanPopupDescription(hazard.description))}</div>
          <div style="font-size:11px;color:#5f6b66">
            ${escapeHtml(meta.label)} · ${escapeHtml(severityLabel(hazard.severity) || 'Unknown')}<br/>
            Updated: ${escapeHtml(formatUpdatedTime(hazard.updatedAt))}<br/>
            Source: ${escapeHtml(hazard.source)}
          </div>
        </div>
      `).addTo(hazardLayer!)
      marker.on('click', (e: L.LeafletMouseEvent) => L.DomEvent.stopPropagation(e))
    })
  }

  function drawReports(): void {
    if (!reportLayer) return
    reportLayer.clearLayers()
    sortedReports.value.forEach((report: any) => {
      if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) return
      const meta = hazardMeta[report.hazardType] || hazardMeta.other
      const marker = L.marker([report.latitude, report.longitude], {
        icon: L.divIcon({
          className: 'community-report-pin',
          html: `<div class="community-report-pin__dot" style="background:${meta.color}"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7],
        }),
        bubblingMouseEvents: false,
      })
      const img = String(report.imageUrl || '').trim()
      const imgMarkup = img ? `<img class="community-report-popup__thumb" src="${escapeHtml(img)}" alt="Report photo thumbnail" loading="lazy" />` : ''
      marker.bindPopup(`
        <article class="community-report-popup">
          ${imgMarkup}
          <strong class="community-report-popup__title">${escapeHtml(report.title)}</strong>
          <p class="community-report-popup__meta">${escapeHtml(meta.label)} · ${escapeHtml(severityLabel(report.severity))}</p>
          <p class="community-report-popup__location">${escapeHtml(report.locationName)}</p>
          <p class="community-report-popup__description">${escapeHtml(report.description)}</p>
        </article>
      `, { className: 'community-report-popup-shell' }).addTo(reportLayer!)
      marker.on('click', (e: L.LeafletMouseEvent) => L.DomEvent.stopPropagation(e))
    })
  }

  function drawSelectedPoint(): void {
    if (!selectedPointLayer) return
    selectedPointLayer.clearLayers()
    if (!selectedPoint.value) return
    L.marker([selectedPoint.value.lat, selectedPoint.value.lng], {
      icon: L.divIcon({
        className: 'planner-anchor-icon',
        html: '<div class="planner-anchor planner-anchor--report">R</div>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      }),
    }).bindPopup('Selected report point').addTo(selectedPointLayer)
  }

  // ── Setup & teardown ──────────────────────────────────

  onMounted(() => {
    syncViewportMode()
    window.addEventListener('resize', syncViewportMode)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', syncViewportMode)
    if (refreshTimer) window.clearInterval(refreshTimer)
    if (inflightReportController) inflightReportController.abort()
    if (inflightHazardController) inflightHazardController.abort()
    if (addressSearchController) addressSearchController.abort()
    if (reverseLookupController) reverseLookupController.abort()
    if (mapInstance) { mapInstance.remove(); mapInstance = null }
  })

  // Watchers
  watch(hazards, drawHazards, { deep: true })
  watch(sortedReports, drawReports, { deep: true })
  watch(selectedPoint, drawSelectedPoint, { deep: true })

  return {
    // State
    mapElement, reports, hazards, fetchedAt, storageMode, loading, submitLoading, error, submitError, submitSuccess,
    selectedPoint, isSheetExpanded, activeMobileTab, isMobileViewport, selectedMapStyle, isMapLocatingUser, isViewingUserLocation,
    addressQuery, addressSuggestions, locatingMe, searchingAddress, showEmergencyModal,
    imageUploading, imagePreviewUrl, imageError, imageFileInput,
    form,
    // Computed
    sortedReports, stats, selectedPointLabel,
    // Actions
    onImageFileSelected, clearImageAttachment,
    dismissEmergencyModal, confirmEmergencyAndCall,
    useMyLocation, searchAddress, applyAddressSuggestion, clearAddressSearch,
    handleSubmit, loadReports,
    switchMapStyle, recenterCommunityMap, locateMapUser, toggleSheet: () => { isSheetExpanded.value = !isSheetExpanded.value },
    initMap, getMapInstance,
    loadHazards,
  }
}
