# Victoria Map Boundary Enforcement (2026-03-31)

## Summary

Restricted interactive map selection and navigation to Victoria across the main mapping workflows.

## Scope

Applied to:

- `Home Risk Preview`
- `Risk Map`
- `Plan Route`
- `Community Reports`
- `Admin Dashboard`

## Frontend Changes

- Added shared map boundary helper:
  - `frontend/src/utils/victoriaMap.js`
- Added a generated Victoria boundary dataset sourced from Vicmap GeoJSON polygons:
  - `frontend/src/utils/victoriaBoundaryData.js`
- Introduced a shared Victoria map boundary model using a bounding box for viewport limits and official Victoria polygon data for in-state point validation.
- Added reusable helpers to:
  - keep Leaflet maps draggable while constraining movement to Victoria
  - prevent zooming out beyond the default Victoria view
  - reject out-of-state point selection on interactive maps
  - clamp map bbox requests before hazard fetches
- Updated these views to use the shared Victoria map constraints:
  - `frontend/src/components/HomeRiskPreviewMap.vue`
  - `frontend/src/views/RiskMap.vue`
  - `frontend/src/views/RoutePlanner.vue`
  - `frontend/src/views/CommunityReports.vue`
  - `frontend/src/views/AdminDashboard.vue`

## Behavior Changes

- Users can no longer pan interactive maps beyond Victoria.
- Interactive maps remain draggable inside Victoria, but cannot be moved beyond the Victoria bounds.
- Home page preview map now stays within Victoria when fitting hazard markers.
- Point selection on planner/report/admin maps is validated against the real Victoria state boundary polygons, not only a rectangular viewport.
- Dragged admin map items are clamped back into Victoria.
- Hazard fetch bbox values are constrained to Victoria even after map movement.
- Risk Map user-location centering now clamps out-of-state coordinates back to the nearest point within Victoria.

## Impact

- Keeps route planning, reporting, and dashboard operations aligned with the app's Victoria-only geographic scope.
- Prevents accidental out-of-state coordinate submission from map interactions.
