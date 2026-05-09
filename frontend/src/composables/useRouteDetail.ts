import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { restoreLatestRoutePlan, setLatestRoutePlan } from '../services/routePlanStore'
import { fetchRealtimeHazards } from '../services/hazardApi'
import { planSafeRoute } from '../services/routeApi'

// ── Constants ──────────────────────────────────────────

const ROUTE_SOURCE_ID = 'recommended-route-source'
const ROUTE_LAYER_ID = 'recommended-route-line'
const ROUTE_CASING_LAYER_ID = 'recommended-route-line-casing'
const HAZARD_ZONE_SOURCE_ID = 'hazard-zone-source'
const HAZARD_ZONE_LAYER_ID = 'hazard-zone-layer'
const HAZARD_POINT_SOURCE_ID = 'hazard-point-source'
const HAZARD_POINT_LAYER_ID = 'hazard-point-layer'
const TERRAIN_SOURCE_ID = 'mapbox-dem'
const TERRAIN_HILLSHADE_LAYER_ID = 'terrain-hillshade-layer'

const LAYER_META: Record<string, { label: string; color: string }> = {
  fire: { label: 'Bushfire', color: '#D84727' },
  flood: { label: 'Flood', color: '#2165B5' },
  storm: { label: 'Storm', color: '#5A4B81' },
  heat: { label: 'Heat', color: '#D08817' },
  trail: { label: 'Trail', color: '#6B5C4F' },
  other: { label: 'Other', color: '#2E7D6B' },
}

const SEVERITY_LABEL: Record<string, string> = { extreme: 'Extreme', high: 'High', moderate: 'Moderate', low: 'Low' }
const ROUTE_DIFFICULTY_SLOTS = ['Easy', 'Moderate', 'Hard']
const THREE_D_CAMERA = { pitch: 74, bearing: 36 }

// ── Utilities ──────────────────────────────────────────

function escapeHtml(value = ''): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function cleanPopupDescription(value = ''): string {
  return String(value).replace(/<br\s*\/?>/gi, ' ').replace(/<\/?strong>/gi, ' ').replace(/\s{2,}/g, ' ').trim()
}
function formatUpdatedTime(value: string): string {
  const ts = Date.parse(value || '')
  if (Number.isNaN(ts)) return 'Time unknown'
  return new Date(ts).toLocaleString()
}
function routeGeometryToLngLat(geometry: any[] = []): [number, number][] {
  return geometry.filter((p) => Array.isArray(p) && p.length === 2)
    .map(([lat, lng]) => [Number(lng), Number(lat)])
    .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng)) as [number, number][]
}
function toFeatureCollection(features: any[]): { type: string; features: any[] } {
  return { type: 'FeatureCollection', features }
}

export function formatDuration(durationMin: number): string {
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

// ── Composable ─────────────────────────────────────────

export function useRouteDetail() {
  const router = useRouter()
  const route = useRoute()
  const mapElement: Ref<HTMLElement | null> = ref(null)
  const plan = ref<any>(null)
  const planningFromShare = ref(false)
  const shareMessage = ref('')
  const shareError = ref('')
  const mapInitError = ref('')
  const isSheetExpanded = ref(false)
  const isTerrain3D = ref(true)
  const selectedRouteId = ref('')

  const mapboxToken = String(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim()
  const hazards = ref<any[]>([])

  // Map internals
  let mapInstance: mapboxgl.Map | null = null
  let mapReady = false
  let hazardInflightController: AbortController | null = null
  let hazardRefreshTimer: number | null = null
  let startMarker: mapboxgl.Marker | null = null
  let endMarker: mapboxgl.Marker | null = null
  let activeHazardPopup: mapboxgl.Popup | null = null
  let compassButtonElement: HTMLElement | null = null

  // ── Computed ──────────────────────────────────────────

  function buildRouteChoices(planPayload: any): any[] {
    if (!planPayload) return []
    const fromApi = Array.isArray(planPayload.routeOptions) ? planPayload.routeOptions.slice(0, 3) : []
    if (fromApi.length) {
      const selected: any[] = []
      const usedIds = new Set<string>()
      ROUTE_DIFFICULTY_SLOTS.forEach((slot) => {
        const matchBySlot = fromApi.find((item: any) => item.targetDifficulty === slot && !usedIds.has(item.id))
        const fallbackUnique = fromApi.find((item: any) => !usedIds.has(item.id))
        const match = matchBySlot || fallbackUnique
        if (!match) return
        usedIds.add(match.id)
        selected.push({ ...match, slotDifficulty: slot, optionLabel: slot })
      })
      return selected
    }
    const pool = [planPayload.recommendedRoute, ...(planPayload.alternatives || [])].filter(Boolean)
    const selected: any[] = []
    const usedIds = new Set<string>()
    ROUTE_DIFFICULTY_SLOTS.forEach((slot) => {
      const hit = pool.find((item: any) => item.difficulty === slot && !usedIds.has(item.id))
      if (!hit) return
      usedIds.add(hit.id)
      selected.push({ ...hit, slotDifficulty: slot, optionLabel: slot })
    })
    pool.forEach((item: any) => {
      if (selected.length >= 3 || usedIds.has(item.id)) return
      const slot = ROUTE_DIFFICULTY_SLOTS[selected.length] || item.difficulty || 'Moderate'
      usedIds.add(item.id)
      selected.push({ ...item, slotDifficulty: slot, optionLabel: slot })
    })
    return selected.slice(0, 3)
  }

  const routeChoices = computed(() => buildRouteChoices(plan.value))

  const recommended = computed(() => {
    const choices = routeChoices.value
    if (choices.length) {
      const current = choices.find((item: any) => item.id === selectedRouteId.value)
      return current || choices[0]
    }
    return plan.value?.recommendedRoute || null
  })

  const prepTips = computed(() => recommended.value?.suggestedPrep || [])
  const geography = computed(() => recommended.value?.geographyProfile || null)
  const recommendedGoNoGoLabel = computed(() => {
    const v = recommended.value?.safetyStatus || recommended.value?.goNoGo || ''
    return v === 'No-Go' || v === 'Dangerous' ? 'Dangerous' : 'Safe'
  })
  const recommendedIsDangerous = computed(() => {
    const v = recommended.value?.safetyStatus || recommended.value?.goNoGo
    return v === 'No-Go' || v === 'Dangerous'
  })

  function selectRoute(routeId: string): void {
    if (!routeId || routeId === selectedRouteId.value) return
    selectedRouteId.value = routeId
    if (plan.value) {
      const pick = routeChoices.value.find((item: any) => item.id === routeId)
      if (pick) setLatestRoutePlan({ ...plan.value, recommendedRoute: pick })
    }
  }

  // ── Map helpers ───────────────────────────────────────

  function isThreeDReady(): boolean {
    return Boolean(inferStartEndFromPlan()?.start && recommended.value?.geometry?.length)
  }

  function inferStartEndFromPlan() {
    if (plan.value?.start && plan.value?.end) return { start: plan.value.start, end: plan.value.end }
    const geometry = plan.value?.recommendedRoute?.geometry || []
    if (geometry.length < 2) return null
    return { start: { lat: geometry[0][0], lng: geometry[0][1] }, end: { lat: geometry[geometry.length - 1][0], lng: geometry[geometry.length - 1][1] } }
  }

  function focusRouteIn3D(routeCoordinates: [number, number][], animated = true): void {
    if (!mapInstance || !routeCoordinates.length) return
    const bounds = routeCoordinates.reduce((acc, c) => acc.extend(c), new mapboxgl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]))
    mapInstance.fitBounds(bounds, {
      padding: { top: 80, right: 90, bottom: 100, left: 90 },
      duration: animated ? 950 : 0,
      pitch: isThreeDReady() ? THREE_D_CAMERA.pitch : 0,
      bearing: isThreeDReady() ? THREE_D_CAMERA.bearing : 0,
    })
  }

  function setCameraTo2D(animated = true): void {
    if (!mapInstance) return
    mapInstance.easeTo({ pitch: 0, bearing: 0, duration: animated ? 650 : 0, essential: true })
    isTerrain3D.value = false
  }

  function toggleTerrainMode(): void {
    if (!mapInstance) return
    if (isTerrain3D.value) { setCameraTo2D(true); return }
    focusRouteIn3D(routeGeometryToLngLat(recommended.value?.geometry || []), true)
    isTerrain3D.value = true
  }

  // ── Hazard / Route rendering ──────────────────────────

  function buildHazardZoneFeatures(): any[] {
    return hazards.value.flatMap((hazard: any) => {
      const meta = LAYER_META[hazard.type] || LAYER_META.other
      if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return []
      const [lat, lng] = hazard.coordinates
      const sev = hazard.severity || 'low'
      const opacities = sev === 'extreme' ? { near: 0.24, mid: 0.15, far: 0.08 }
        : sev === 'high' ? { near: 0.2, mid: 0.12, far: 0.07 }
        : sev === 'moderate' ? { near: 0.16, mid: 0.1, far: 0.06 }
        : { near: 0.13, mid: 0.08, far: 0.05 }
      return [
        { key: 'far', radius: 34, opacity: opacities.far },
        { key: 'mid', radius: 24, opacity: opacities.mid },
        { key: 'near', radius: 14, opacity: opacities.near },
      ].map((z) => ({
        type: 'Feature',
        properties: { id: `${hazard.id || hazard.title || 'hazard'}-${z.key}`, color: meta.color, radius: z.radius, opacity: z.opacity },
        geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
      }))
    })
  }

  function buildHazardPointFeatures(): any[] {
    return hazards.value.map((hazard: any) => {
      const meta = LAYER_META[hazard.type] || LAYER_META.other
      if (!Array.isArray(hazard.coordinates) || hazard.coordinates.length !== 2) return null
      const [lat, lng] = hazard.coordinates
      const sev = hazard.severity || 'low'
      return {
        type: 'Feature',
        properties: {
          id: String(hazard.id || `${hazard.type}-${hazard.title}`),
          title: hazard.title || 'Hazard', description: cleanPopupDescription(hazard.description || ''),
          severity: sev, type: hazard.type || 'other',
          category: hazard.type === 'other' ? 'Other' : (hazard.riskCategory || meta.label || 'Unspecified'),
          source: hazard.source || 'Unknown', updatedAt: formatUpdatedTime(hazard.updatedAt),
          color: meta.color, radius: sev === 'extreme' ? 8 : sev === 'high' ? 7 : sev === 'moderate' ? 6 : 5, label: meta.label,
        },
        geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
      }
    }).filter(Boolean)
  }

  function applyRouteGeometry(): void {
    if (!mapInstance || !mapReady) return
    const coords = routeGeometryToLngLat(recommended.value?.geometry || [])
    const data = toFeatureCollection(coords.length ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }] : [])
    const src = mapInstance.getSource(ROUTE_SOURCE_ID)
    if (src) { (src as mapboxgl.GeoJSONSource).setData(data as any) } else {
      mapInstance.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: data as any })
      mapInstance.addLayer({ id: ROUTE_CASING_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 10, 'line-opacity': 0.75 } })
      mapInstance.addLayer({ id: ROUTE_LAYER_ID, type: 'line', source: ROUTE_SOURCE_ID, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1F6E57', 'line-width': 6, 'line-opacity': 0.92 } })
    }
    if (startMarker) { startMarker.remove(); startMarker = null }
    if (endMarker) { endMarker.remove(); endMarker = null }
    if (coords.length >= 2) {
      const pinEl = (label: string, colors: any) => {
        const el = document.createElement('div'); el.className = 'route-pin-marker'
        el.innerHTML = `<span style="background:${colors.bg};border-color:${colors.border};">${label}</span>`; return el
      }
      startMarker = new mapboxgl.Marker({ element: pinEl('S', { bg: '#2E9D7A', border: '#1F6E57' }) }).setLngLat(coords[0]).setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Start')).addTo(mapInstance)
      endMarker = new mapboxgl.Marker({ element: pinEl('E', { bg: '#D84727', border: '#A6382A' }) }).setLngLat(coords[coords.length - 1]).setPopup(new mapboxgl.Popup({ offset: 14 }).setText('Destination')).addTo(mapInstance)
      focusRouteIn3D(coords, true)
      if (isThreeDReady()) window.setTimeout(() => mapInstance?.easeTo({ pitch: THREE_D_CAMERA.pitch, bearing: THREE_D_CAMERA.bearing, duration: 850, essential: true }), 980)
    }
  }

  function applyHazardLayers(): void {
    if (!mapInstance || !mapReady) return
    const zoneData = toFeatureCollection(buildHazardZoneFeatures())
    const pointData = toFeatureCollection(buildHazardPointFeatures())
    const zoneSrc = mapInstance.getSource(HAZARD_ZONE_SOURCE_ID)
    if (zoneSrc) { (zoneSrc as mapboxgl.GeoJSONSource).setData(zoneData as any) } else {
      mapInstance.addSource(HAZARD_ZONE_SOURCE_ID, { type: 'geojson', data: zoneData as any })
      mapInstance.addLayer({ id: HAZARD_ZONE_LAYER_ID, type: 'circle', source: HAZARD_ZONE_SOURCE_ID, paint: { 'circle-radius': ['get', 'radius'], 'circle-color': ['get', 'color'], 'circle-opacity': ['get', 'opacity'] } })
    }
    const ptSrc = mapInstance.getSource(HAZARD_POINT_SOURCE_ID)
    if (ptSrc) { (ptSrc as mapboxgl.GeoJSONSource).setData(pointData as any) } else {
      mapInstance.addSource(HAZARD_POINT_SOURCE_ID, { type: 'geojson', data: pointData as any })
      mapInstance.addLayer({ id: HAZARD_POINT_LAYER_ID, type: 'circle', source: HAZARD_POINT_SOURCE_ID, paint: { 'circle-radius': ['get', 'radius'], 'circle-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.9 } })
      mapInstance.on('mouseenter', HAZARD_POINT_LAYER_ID, () => { mapInstance!.getCanvas().style.cursor = 'pointer' })
      mapInstance.on('mouseleave', HAZARD_POINT_LAYER_ID, () => { mapInstance!.getCanvas().style.cursor = '' })
      mapInstance.on('click', HAZARD_POINT_LAYER_ID, (event: any) => {
        const f = event?.features?.[0]?.properties; if (!f) return
        if (activeHazardPopup) { activeHazardPopup.remove(); activeHazardPopup = null }
        activeHazardPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 })
          .setLngLat(event.features[0].geometry.coordinates)
          .setHTML(`<div style="min-width:200px"><div style="font-weight:800;margin-bottom:6px">${escapeHtml(f.title)}</div><div style="font-size:12px;margin-bottom:8px">${escapeHtml(f.description)}</div><div style="font-size:11px;color:#5f6b66">${escapeHtml(f.label)} · ${escapeHtml(SEVERITY_LABEL[f.severity] || 'Unknown')}<br/>Category: ${escapeHtml(f.category)}<br/>Updated: ${escapeHtml(f.updatedAt)}<br/>Source: ${escapeHtml(f.source)}</div></div>`).addTo(mapInstance!)
      })
    }
  }

  async function loadHazards(): Promise<void> {
    if (!mapInstance || !mapReady) return
    if (hazardInflightController) hazardInflightController.abort()
    hazardInflightController = new AbortController()
    try {
      const bounds = mapInstance.getBounds()!
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
      const payload = await (fetchRealtimeHazards as any)({ bbox, layers: ['fire', 'flood', 'storm', 'heat', 'trail', 'other'], signal: hazardInflightController.signal, preferCache: true, onUpdate: (p: any) => { hazards.value = p.hazards; applyHazardLayers() } })
      hazards.value = payload.hazards; applyHazardLayers()
    } catch (e: any) { if (e?.name === 'AbortError') return }
  }

  // ── Share / Google Maps ───────────────────────────────

  function buildShareUrl(): string {
    const points = inferStartEndFromPlan(); if (!points) return ''
    const url = new URL(window.location.origin + '/route-detail')
    url.searchParams.set('slat', String(points.start.lat)); url.searchParams.set('slng', String(points.start.lng))
    url.searchParams.set('elat', String(points.end.lat)); url.searchParams.set('elng', String(points.end.lng))
    return url.toString()
  }

  async function shareRoute(): Promise<void> {
    shareError.value = ''; const url = buildShareUrl()
    if (!url) { shareError.value = 'No route data available'; return }
    try {
      if (navigator.share) { await navigator.share({ title: 'HikeShield Route Plan', text: 'Safer pre-hike route', url }); shareMessage.value = 'Shared.'; return }
      await navigator.clipboard.writeText(url); shareMessage.value = 'Link copied.'
    } catch (e: any) { shareError.value = e?.message || 'Failed to share' }
  }

  function openInGoogleMaps(): void {
    shareError.value = ''; const points = inferStartEndFromPlan()
    if (!points) { shareError.value = 'No route data'; return }
    const { start, end } = points
    let url = `https://www.google.com/maps/dir/?api=1&origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&travelmode=walking`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Shared link hydration ─────────────────────────────

  function parseSharedPoint() {
    const asVal = (v: any) => Array.isArray(v) ? v[0] : v
    const slat = Number(asVal(route.query.slat)), slng = Number(asVal(route.query.slng))
    const elat = Number(asVal(route.query.elat)), elng = Number(asVal(route.query.elng))
    if (![slat, slng, elat, elng].every(Number.isFinite)) return null
    return { start: { lat: slat, lng: slng }, end: { lat: elat, lng: elng } }
  }

  async function hydrateFromSharedLink(): Promise<void> {
    const shared = parseSharedPoint(); if (!shared) return
    planningFromShare.value = true; shareError.value = ''
    try {
      const payload = await planSafeRoute({ start: shared.start, end: shared.end })
      const nextPlan = { ...payload, start: shared.start, end: shared.end }
      setLatestRoutePlan(nextPlan); plan.value = nextPlan; applyRouteGeometry()
    } catch (e: any) { shareError.value = e?.message || 'Failed to load shared route' }
    finally { planningFromShare.value = false }
  }

  // ── Map init ──────────────────────────────────────────

  function initMap(): void {
    if (!mapElement.value) return
    if (!mapboxToken) { mapInitError.value = 'Mapbox token missing'; return }
    mapboxgl.accessToken = mapboxToken
    mapInstance = new mapboxgl.Map({ container: mapElement.value, style: 'mapbox://styles/mapbox/outdoors-v12', center: [144.9631, -37.8136], zoom: 7, pitch: 0, bearing: 0, antialias: true, maxPitch: 85 })
    mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    mapInstance.on('load', () => {
      mapReady = true
      if (!mapInstance!.getSource(TERRAIN_SOURCE_ID)) { mapInstance!.addSource(TERRAIN_SOURCE_ID, { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 }); mapInstance!.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.9 }) }
      if (!mapInstance!.getLayer(TERRAIN_HILLSHADE_LAYER_ID)) mapInstance!.addLayer({ id: TERRAIN_HILLSHADE_LAYER_ID, type: 'hillshade', source: TERRAIN_SOURCE_ID, paint: { 'hillshade-exaggeration': 0.8, 'hillshade-shadow-color': '#5f5a4c', 'hillshade-highlight-color': '#efe6cd', 'hillshade-accent-color': '#9c9277' } })
      mapInstance!.setFog({ color: '#d7ebdf', 'high-color': '#f2f8f5', 'space-color': '#f7fbfa', 'horizon-blend': 0.22 })
      applyRouteGeometry(); applyHazardLayers(); loadHazards()
      hazardRefreshTimer = window.setInterval(loadHazards, 60_000)
      mapInstance!.on('moveend', loadHazards)
    })
  }

  // ── Lifecycle ─────────────────────────────────────────

  onMounted(() => {
    plan.value = restoreLatestRoutePlan()
    selectedRouteId.value = plan.value?.recommendedRoute?.id || routeChoices.value[0]?.id || ''
    initMap(); hydrateFromSharedLink()
  })

  watch(() => plan.value, () => { if (!selectedRouteId.value) selectedRouteId.value = plan.value?.recommendedRoute?.id || routeChoices.value[0]?.id || '' })
  watch(() => recommended.value?.id, () => applyRouteGeometry())
  watch(() => route.fullPath, () => { if (plan.value?.recommendedRoute) return; hydrateFromSharedLink() })

  onUnmounted(() => {
    if (hazardInflightController) hazardInflightController.abort()
    if (hazardRefreshTimer) window.clearInterval(hazardRefreshTimer)
    if (activeHazardPopup) { activeHazardPopup.remove(); activeHazardPopup = null }
    if (startMarker) { startMarker.remove(); startMarker = null }
    if (endMarker) { endMarker.remove(); endMarker = null }
    if (mapInstance) { mapInstance.remove(); mapInstance = null }
  })

  return {
    mapElement, plan, planningFromShare, shareMessage, shareError, mapInitError,
    isSheetExpanded, isTerrain3D, selectedRouteId, hazards, mapboxToken,
    routeChoices, recommended, prepTips, geography, recommendedGoNoGoLabel, recommendedIsDangerous,
    selectRoute, toggleSheet: () => { isSheetExpanded.value = !isSheetExpanded.value },
    openInGoogleMaps, shareRoute, toggleTerrainMode,
    formatDuration,
  }
}
