# Route Planner Risk Model Update (2026-03-28)

## Summary

Route planning was recalibrated to use hiking semantics instead of effectively showing driving-time behavior.

## What Changed

- OSRM route generation now defaults to the `foot` profile
- Route duration now uses hiking-oriented time estimation
  - keeps OSRM geometry
  - compares OSRM travel time with distance-based hiking time
  - returns the larger value as `durationMin`
- Risk scoring now combines:
  - hazard proximity impact
  - weather hazard impact
  - route risk-zone exposure (`L1 / L2 / L3`)
  - route burden (distance, hiking duration, detour cost)
  - feasibility penalty for routes that are unrealistic for a normal hiking outing
- `Go / No-Go` now also considers route length and total hiking duration caps by user level
- Frontend duration display now formats long trips as `h` / `d h` instead of always raw minutes
- Route risk input now merges:
  - official hazard snapshot
  - manual hazards
  - community reports
- Route geography is now cached in PostgreSQL per route geometry hash
  - elevation min/max
  - total ascent / descent
  - max / average slope
  - dominant terrain type
  - dominant surface type
  - trail condition
  - river crossing count
  - cliff exposure count
  - closure count

## Backend Files

- `backend/src/config/index.js`
- `backend/src/modules/routes/adapters/osrmAdapter.js`
- `backend/src/modules/routes/repositories/routeGeographyRepository.js`
- `backend/src/modules/routes/domain/routeRisk.js`
- `backend/src/modules/routes/domain/routeRisk.test.js`
- `backend/src/modules/routes/services/routeGeographyService.js`
- `backend/src/modules/routes/services/routePlannerService.js`
- `backend/README.md`

## Frontend Files

- `frontend/src/views/RoutePlanner.vue`
- `frontend/src/views/RouteDetail.vue`

## Result

- Long routes no longer show unrealistic car-like durations
- Extremely long hiking routes can now surface as `Moderate/High` risk and `No-Go`
- Route difficulty and route risk are more consistent with actual hiking effort
