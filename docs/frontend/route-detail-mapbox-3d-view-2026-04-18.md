# Route Detail: Mapbox 3D View on View Route Details (2026-04-18)

## Goal
- Enable a 3D route experience when users finish selecting start/end points and enter Route Detail via `View Route Details`.
- Keep existing route safety details and sharing flow unchanged.

## Changes
- Replaced Route Detail map renderer from Leaflet to Mapbox GL JS in:
  - `frontend/src/views/RouteDetail.vue`
- Added 3D presentation for recommended route:
  - Terrain enabled with DEM source
  - Route line + start/end markers on Mapbox layers
  - Camera fit with pitch and bearing for a clear 3D perspective
- Migrated hazard rendering on Route Detail map to Mapbox GeoJSON layers:
  - Multi-ring hazard zones
  - Hazard point markers
  - Click popup details (title, severity, category, updated time, source)
- Added Mapbox token setup to:
  - `frontend/.env.example`

## Environment
- Required frontend env var:
  - `VITE_MAPBOX_ACCESS_TOKEN` (Mapbox public token, starts with `pk.`)

## Impact
- Users now get a more intuitive, spatial 3D understanding of planned routes in Route Detail.
- If the token is missing, the page shows a clear setup message instead of silently failing.
