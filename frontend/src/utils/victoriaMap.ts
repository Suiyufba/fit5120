// @ts-nocheck
import * as L from 'leaflet'
import { VICTORIA_BOUNDARY_COORDINATES } from './victoriaBoundaryData'

export const VICTORIA_VIEW = {
  center: [-37.8136, 144.9631],
  zoom: 7,
  minZoom: 6,
}

export const VICTORIA_BOUNDS = L.latLngBounds(
  [-39.45, 140.85],
  [-33.85, 150.05]
)

function isPointOnSegment(point, start, end, epsilon = 1e-9) {
  const cross =
    (point.lng - start[0]) * (end[1] - start[1])
    - (point.lat - start[1]) * (end[0] - start[0])

  if (Math.abs(cross) > epsilon) return false

  const dot =
    (point.lng - start[0]) * (end[0] - start[0])
    + (point.lat - start[1]) * (end[1] - start[1])

  if (dot < 0) return false

  const squaredLength =
    (end[0] - start[0]) * (end[0] - start[0])
    + (end[1] - start[1]) * (end[1] - start[1])

  return dot <= squaredLength
}

function isPointInRing(point, ring) {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const current = ring[i]
    const previous = ring[j]

    if (isPointOnSegment(point, current, previous)) {
      return true
    }

    const intersects =
      ((current[1] > point.lat) !== (previous[1] > point.lat))
      && (
        point.lng
        < ((previous[0] - current[0]) * (point.lat - current[1])) / (previous[1] - current[1])
          + current[0]
      )

    if (intersects) inside = !inside
  }

  return inside
}

function isPointInPolygon(point, polygonRings) {
  if (!polygonRings.length) return false
  if (!isPointInRing(point, polygonRings[0])) return false

  for (let index = 1; index < polygonRings.length; index += 1) {
    if (isPointInRing(point, polygonRings[index])) {
      return false
    }
  }

  return true
}

export function clampLatLngToVictoria(latlng) {
  const nextLatLng = L.latLng(latlng)
  const southWest = VICTORIA_BOUNDS.getSouthWest()
  const northEast = VICTORIA_BOUNDS.getNorthEast()

  return L.latLng(
    Math.min(Math.max(nextLatLng.lat, southWest.lat), northEast.lat),
    Math.min(Math.max(nextLatLng.lng, southWest.lng), northEast.lng)
  )
}

export function isLatLngInVictoria(latlng) {
  const point = L.latLng(latlng)
  return VICTORIA_BOUNDS.contains(point)
    && VICTORIA_BOUNDARY_COORDINATES.some((polygonRings) => isPointInPolygon(point, polygonRings))
}

export function getVictoriaBbox() {
  const southWest = VICTORIA_BOUNDS.getSouthWest()
  const northEast = VICTORIA_BOUNDS.getNorthEast()
  return [southWest.lng, southWest.lat, northEast.lng, northEast.lat]
}

export function clampBoundsToVictoria(boundsLike) {
  const bounds = L.latLngBounds(boundsLike)
  const southWest = clampLatLngToVictoria(bounds.getSouthWest())
  const northEast = clampLatLngToVictoria(bounds.getNorthEast())

  return L.latLngBounds(southWest, northEast)
}

export function getMapBboxWithinVictoria(mapInstance) {
  if (!mapInstance) return getVictoriaBbox()
  const bounds = clampBoundsToVictoria(mapInstance.getBounds())
  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ]
}

export function applyVictoriaMapConstraints(mapInstance) {
  if (!mapInstance) return

  const lockedZoom = mapInstance.getBoundsZoom(VICTORIA_BOUNDS, false, [24, 24])

  mapInstance.options.maxBounds = VICTORIA_BOUNDS
  mapInstance.options.maxBoundsViscosity = 1
  mapInstance.setMinZoom(lockedZoom)
  mapInstance.setMaxZoom(18)
  mapInstance.setView(VICTORIA_BOUNDS.getCenter(), lockedZoom, {
    animate: false,
    reset: true,
  })

  mapInstance.boxZoom.disable()
  mapInstance.keyboard.disable()

  mapInstance.on('drag', () => {
    mapInstance.panInsideBounds(VICTORIA_BOUNDS, { animate: false })
  })

  mapInstance.on('zoomend', () => {
    if (mapInstance.getZoom() < lockedZoom) {
      mapInstance.setZoom(lockedZoom)
    }
    mapInstance.panInsideBounds(VICTORIA_BOUNDS, { animate: false })
  })
}
