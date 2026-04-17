# Route Geography Profile Cache Refresh (2026-04-17)

## Goal
- Fix `Geography Profile` showing zeros or `unknown` values for a long time after one failed fetch.
- Clarify where geography data comes from (external APIs + PostgreSQL cache).

## Data Sources
- Elevation and slope:
  - OpenTopoData API (`OPENTOPO_DATA_API_URL`, dataset `OPENTOPO_DATA_DATASET`)
- Terrain and constraints:
  - Overpass API (`OVERPASS_API_URL`) querying OSM tags near route geometry
- Cache storage:
  - PostgreSQL table `route_geography_profiles`

## Root Cause
- When one route was first computed during an API timeout/failure, the service wrote fallback zeros/unknown values into cache.
- Later requests trusted cache directly, so stale low-quality data persisted.

## Changes
- `backend/src/modules/routes/services/routeGeographyService.js`
  - Added profile quality check (`isMeaningfulGeographyProfile`).
  - Cached profile is returned only if it contains meaningful geography signals.
  - If cached profile looks empty, service recomputes via OpenTopoData + Overpass.
  - Added warning logs when elevation or terrain fetch fails.
- `backend/src/modules/routes/repositories/routeGeographyRepository.js`
  - Bumped `ROUTE_GEOGRAPHY_PROFILE_VERSION` to `4` to invalidate older low-quality cache rows.

## Impact
- Existing stale zero-value geography caches are bypassed/rebuilt.
- New route planning results should show real ascent/descent/slope and richer terrain metadata whenever upstream APIs respond.
