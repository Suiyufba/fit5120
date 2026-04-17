# Route Detail: 2D/3D Toggle Recovery Fix (2026-04-18)

## Goal
- Fix the issue where users could switch to 2D but had no reliable way to switch back to 3D terrain view.

## Changes
- Updated `frontend/src/views/RouteDetail.vue`.
- Added an explicit `Switch To 2D View` / `Switch To 3D Terrain View` button in Route Detail panel.
- Added camera-state tracking (`isTerrain3D`) to keep button label consistent with current map pitch.
- Added camera helpers for stable switching:
  - `setCameraTo2D()`
  - `activateTerrainView()` / route-focused 3D camera recovery
- Synced mode state with Mapbox camera events (`pitchend`, `rotateend`) so manual map interactions keep UI state accurate.

## Impact
- Users can now reliably switch between 2D and 3D multiple times.
- 3D route perspective can be recovered instantly after manual camera moves.
