import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
// @ts-ignore — @types/leaflet not installed
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRealtimeHazards } from '../services/hazardApi'
import {
  applyVictoriaMapConstraints,
  getMapBboxWithinVictoria,
  getVictoriaBbox,
  isLatLngInVictoria,
  VICTORIA_VIEW,
} from '../utils/victoriaMap'
import {
  createLeafletBaseLayer,
  DEFAULT_MAP_VISUAL_STYLE,
  MAP_VISUAL_STYLES,
} from '../utils/mapVisualStyles'

const REFRESH_EVERY_MS = 60_000

export const layerMeta: Record<string, { label: string; color: string }> = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const severityOrder: Record<string, number> = { extreme: 4, high: 3, moderate: 2, low: 1 }
export const severityLabel: Record<string, string> = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }

function escapeHtml(v = '') { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }
function cleanPopup(v = '') { return String(v).replace(/<br\s*\/?>/gi, ' ').replace(/<\/?strong>/gi, ' ').replace(/\s{2,}/g, ' ').trim() }
function formatTime(v: string) { const t = Date.parse(v || ''); return Number.isNaN(t) ? 'Time unknown' : new Date(t).toLocaleString() }

export function useRiskMap() {
  const mapElement = ref<HTMLElement | null>(null)
  const selectedHazardId = ref('')
  const hazards = ref<any[]>([])
  const statewideHazards = ref<any[]>([])
  const loading = ref(false)
  const lastUpdatedAt = ref<Date | null>(null)
  const isSheetExpanded = ref(false)
  const selectedMapStyle = ref(DEFAULT_MAP_VISUAL_STYLE)
  const isLocatingUser = ref(false)
  const isViewingUserLocation = ref(false)

  let mapInstance: L.Map | null = null
  let markersLayer: L.LayerGroup | null = null
  let baseTileLayer: L.TileLayer | null = null
  let userLocationLayer: L.LayerGroup | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let inflightController: AbortController | null = null
  let statewideInflightController: AbortController | null = null

  const filteredHazards = computed(() =>
    hazards.value.sort((a, b) => ((severityOrder as any)[b.severity] || 0) - ((severityOrder as any)[a.severity] || 0)),
  )

  const statewideStats = computed(() => {
    const s: Record<string, number> = { extreme: 0, high: 0, moderate: 0, low: 0 }
    statewideHazards.value.forEach((h: any) => { if (s[h.severity] !== undefined) s[h.severity] += 1 })
    return s
  })

  function resolveVisual(h: any) { return (layerMeta as any)[h?.type] || layerMeta.other }

  function renderMarkers() {
    if (!markersLayer) return
    markersLayer.clearLayers()
    filteredHazards.value.forEach((hazard: any) => {
      const meta = resolveVisual(hazard)
      const sev = hazard.severity || 'low'
      const op = sev === 'extreme' ? { l1:0.28,l2:0.18,l3:0.1 } : sev==='high' ? { l1:0.23,l2:0.14,l3:0.08 } : sev==='moderate' ? { l1:0.18,l2:0.11,l3:0.06 } : { l1:0.14,l2:0.09,l3:0.05 }
      ;[5000,3000,1000].forEach((r,i) => L.circle(hazard.coordinates, { radius:r, color:meta.color, fillColor:meta.color, fillOpacity:[op.l3,op.l2,op.l1][i], opacity:0.45, weight:i===2?2:1, interactive:false }).addTo(markersLayer!))
      const mr = sev==='extreme'?12:sev==='high'?10:sev==='moderate'?8:6
      const m = L.circleMarker(hazard.coordinates, { radius:mr, color:meta.color, fillColor:meta.color, fillOpacity:0.8, weight:2 })
      m.bindPopup(`<div style="min-width:200px"><div style="font-weight:800;margin-bottom:6px">${escapeHtml(hazard.title)}</div><div style="font-size:12px;margin-bottom:8px">${escapeHtml(cleanPopup(hazard.description))}</div><div style="font-size:11px;color:#5f6b66">${escapeHtml(meta.label)} · ${escapeHtml(severityLabel[hazard.severity]||'Unknown')}<br/>Category: ${escapeHtml(hazard.type==='other'?'Other':(hazard.riskCategory||meta.label||'Unspecified'))}<br/>Updated: ${escapeHtml(formatTime(hazard.updatedAt))}<br/>Source: ${escapeHtml(hazard.source)}</div></div>`, { className:'hs-map-popup' }).addTo(markersLayer!)
    })
  }

  async function loadHazards() {
    if (inflightController) inflightController.abort()
    inflightController = new AbortController(); loading.value = true
    try {
      const p = await (fetchRealtimeHazards as any)({ bbox: getMapBboxWithinVictoria(mapInstance!), layers: ['fire','flood','storm','heat','trail','other'], signal: inflightController.signal, preferCache: true, onUpdate: (fp: any) => { hazards.value = fp.hazards; lastUpdatedAt.value = fp.fetchedAt || fp.cachedAt || new Date() } })
      hazards.value = p.hazards; lastUpdatedAt.value = p.fetchedAt || p.cachedAt || new Date()
    } catch (e: any) { if (e?.name === 'AbortError') return } finally { loading.value = false }
  }

  async function loadStatewide() {
    if (statewideInflightController) statewideInflightController.abort()
    statewideInflightController = new AbortController()
    try {
      const p = await (fetchRealtimeHazards as any)({ bbox: getVictoriaBbox(), layers: ['fire','flood','storm','heat','trail','other'], signal: statewideInflightController.signal, preferCache: true, onUpdate: (fp: any) => { statewideHazards.value = fp.hazards } })
      statewideHazards.value = p.hazards
    } catch (e: any) { if (e?.name === 'AbortError') return }
  }

  function selectHazard(hazard: any) { selectedHazardId.value = hazard.id; isSheetExpanded.value = true; mapInstance?.setView(hazard.coordinates, Math.max(mapInstance!.getZoom(), 9), { animate: true }) }
  function toggleSheet() { isSheetExpanded.value = !isSheetExpanded.value }

  function switchMapStyle(styleId: string) {
    if (!mapInstance || !(MAP_VISUAL_STYLES as any)[styleId] || selectedMapStyle.value === styleId) return
    selectedMapStyle.value = styleId
    if (baseTileLayer) mapInstance.removeLayer(baseTileLayer)
    baseTileLayer = createLeafletBaseLayer(L, styleId).addTo(mapInstance)
    markersLayer?.bringToFront(); userLocationLayer?.bringToFront()
  }

  function recenterMap() { isViewingUserLocation.value = false; mapInstance?.flyTo(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { duration: 0.55 }) }

  function locateUser() {
    if (isViewingUserLocation.value) { recenterMap(); return }
    if (!navigator.geolocation || isLocatingUser.value) return
    isLocatingUser.value = true
    navigator.geolocation.getCurrentPosition(pos => {
      isLocatingUser.value = false
      const pt = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }
      if (!isLatLngInVictoria(L.latLng(pt.lat, pt.lng))) { window.alert('Location outside Victoria'); return }
      if (userLocationLayer) { userLocationLayer.clearLayers(); L.circleMarker([pt.lat, pt.lng], { radius:8, color:'#fff', fillColor:'#173b31', fillOpacity:1, weight:3 }).bindPopup('Your location',{ className:'hs-map-popup' }).addTo(userLocationLayer); L.circle([pt.lat, pt.lng], { radius: Math.max(pos.coords.accuracy||0,80), color:'#173b31', fillColor:'#173b31', fillOpacity:0.08, opacity:0.24, weight:1, interactive:false }).addTo(userLocationLayer) }
      isViewingUserLocation.value = true; mapInstance?.flyTo([pt.lat, pt.lng], Math.max(mapInstance!.getZoom(),13), {duration:0.65})
    }, () => { isLocatingUser.value = false }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 })
  }

  function initMap(el: HTMLElement) {
    mapInstance = L.map(el, { zoomControl:false, attributionControl:false, fadeAnimation:false, markerZoomAnimation:false, zoomAnimation:false }).setView(VICTORIA_VIEW.center, VICTORIA_VIEW.zoom, { animate:false })
    applyVictoriaMapConstraints(mapInstance)
    baseTileLayer = createLeafletBaseLayer(L, selectedMapStyle.value).addTo(mapInstance)
    markersLayer = L.layerGroup().addTo(mapInstance)
    userLocationLayer = L.layerGroup().addTo(mapInstance)
  }

  function getMapInstance() { return mapInstance }

  onMounted(async () => {
    if (mapElement.value) initMap(mapElement.value)
    await Promise.all([loadHazards(), loadStatewide()])
    refreshTimer = setInterval(() => { loadHazards(); loadStatewide() }, REFRESH_EVERY_MS)
    mapInstance?.on('moveend', loadHazards)
  })

  onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
    if (inflightController) inflightController.abort()
    if (statewideInflightController) statewideInflightController.abort()
    if (mapInstance) { mapInstance.remove(); mapInstance = null }
  })

  watch(filteredHazards, () => { if (!filteredHazards.value.some((h: any) => h.id === selectedHazardId.value)) selectedHazardId.value = ''; renderMarkers() }, { deep: true })

  return {
    mapElement, selectedHazardId, hazards, statewideHazards, loading, lastUpdatedAt, isSheetExpanded, selectedMapStyle,
    isLocatingUser, isViewingUserLocation, filteredHazards, statewideStats,
    selectHazard, toggleSheet, switchMapStyle, recenterMap, locateUser, getMapInstance,
    severityLabel,
  }
}
