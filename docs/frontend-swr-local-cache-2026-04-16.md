# Frontend SWR Local Cache for Hazards and Community Reports (2026-04-16)

Implemented frontend local caching with stale-while-revalidate behavior for hazard and community report reads.

## What changed

- Added shared local cache utility:
  - `frontend/src/services/localCache.js`
  - Uses `localStorage` with payload `version`, `cachedAt`, and `data`.
- Added SWR flow to hazard reads:
  - `frontend/src/services/hazardApi.js`
  - `fetchRealtimeHazards` now supports:
    - `preferCache: true` to return cached data first (if present)
    - `onUpdate` callback to push fresh network data after background refresh
  - Cache key includes `bbox` and `layers`.
- Added SWR flow to community report reads:
  - `frontend/src/services/communityReportApi.js`
  - `fetchCommunityReports` now supports:
    - `preferCache: true`
    - `onUpdate`
  - Cache key includes `limit`.
  - On successful `submitCommunityReport`, community report cache is invalidated.

## Pages wired to SWR cache

- `frontend/src/views/Home.vue`
- `frontend/src/views/RiskMap.vue`
- `frontend/src/views/CommunityReports.vue`
- `frontend/src/views/RoutePlanner.vue`
- `frontend/src/views/RouteDetail.vue`
- `frontend/src/views/LocationDetail.vue`
- `frontend/src/views/AdminDashboard.vue`

## User-facing behavior

- On page open, cached hazards/community reports are shown immediately when available.
- The app then re-fetches latest data in background.
- When fresh data arrives, UI updates automatically and cache is refreshed.

## API changes

- No backend API contract changes.
- Frontend service method signatures were extended with optional SWR parameters:
  - `fetchRealtimeHazards({ ..., preferCache, onUpdate })`
  - `fetchCommunityReports({ ..., preferCache, onUpdate })`
