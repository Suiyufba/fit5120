import * as L from 'leaflet'

export const VICTORIA_VIEW = {
  center: [-37.8136, 144.9631],
  zoom: 7,
  minZoom: 6,
}

export const VICTORIA_BOUNDS = L.latLngBounds(
  [-39.45, 140.85],
  [-33.85, 150.05]
)

const VICTORIA_BORDER_POLYGON = [
  [-34.02, 141.0],
  [-34.08, 141.65],
  [-34.18, 142.35],
  [-34.32, 143.1],
  [-34.42, 143.9],
  [-34.58, 144.65],
  [-34.8, 145.35],
  [-35.0, 146.05],
  [-35.18, 146.68],
  [-35.32, 147.25],
  [-35.55, 147.85],
  [-35.82, 148.32],
  [-36.1, 148.72],
  [-36.32, 149.02],
  [-36.62, 149.98],
  [-37.15, 149.95],
  [-37.62, 149.82],
  [-38.06, 149.66],
  [-38.42, 149.44],
  [-38.78, 149.0],
  [-39.0, 148.35],
  [-39.12, 147.52],
  [-39.18, 146.5],
  [-39.08, 145.45],
  [-38.92, 144.55],
  [-38.7, 143.72],
  [-38.48, 142.95],
  [-38.34, 142.3],
  [-38.3, 141.78],
  [-38.42, 141.26],
  [-38.8, 140.96],
  [-37.95, 140.95],
  [-37.1, 141.0],
  [-36.15, 141.0],
  [-35.15, 141.0],
  [-34.02, 141.0],
]

function isPointOnSegment(point, start, end, epsilon = 1e-9) {
  const cross =
    (point.lng - start.lng) * (end.lat - start.lat)
    - (point.lat - start.lat) * (end.lng - start.lng)

  if (Math.abs(cross) > epsilon) return false

  const dot =
    (point.lng - start.lng) * (end.lng - start.lng)
    + (point.lat - start.lat) * (end.lat - start.lat)

  if (dot < 0) return false

  const squaredLength =
    (end.lng - start.lng) * (end.lng - start.lng)
    + (end.lat - start.lat) * (end.lat - start.lat)

  return dot <= squaredLength
}

function isPointInPolygon(latlng, polygon) {
  const point = L.latLng(latlng)
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = L.latLng(polygon[i])
    const previous = L.latLng(polygon[j])

    if (isPointOnSegment(point, current, previous)) {
      return true
    }

    const intersects =
      ((current.lat > point.lat) !== (previous.lat > point.lat))
      && (
        point.lng
        < ((previous.lng - current.lng) * (point.lat - current.lat)) / (previous.lat - current.lat)
          + current.lng
      )

    if (intersects) inside = !inside
  }

  return inside
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
  return VICTORIA_BOUNDS.contains(point) && isPointInPolygon(point, VICTORIA_BORDER_POLYGON)
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

  mapInstance.setMaxBounds(VICTORIA_BOUNDS)
  mapInstance.options.maxBoundsViscosity = 1
  mapInstance.setMinZoom(lockedZoom)
  mapInstance.setMaxZoom(18)
  mapInstance.fitBounds(VICTORIA_BOUNDS, {
    animate: false,
    padding: [24, 24],
  })

  mapInstance.dragging.disable()
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
