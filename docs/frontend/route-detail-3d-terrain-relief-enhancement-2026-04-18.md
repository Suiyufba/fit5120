# Route Detail: 3D Terrain Relief Enhancement (2026-04-18)

## Goal
- Make Route Detail terrain clearly three-dimensional with visible elevation relief.
- Keep route path easy to read while terrain shading is stronger.

## Changes
- Updated `frontend/src/views/RouteDetail.vue`.
- Increased Mapbox terrain exaggeration for stronger ground height differences.
- Added a `hillshade` layer based on DEM source to make mountain/valley relief visually obvious.
- Tuned 3D camera pitch/bearing for a stronger perspective.
- Added a white casing line under the route so path readability stays high on complex terrain.
- Added `Recenter 3D Terrain View` button to quickly restore focused terrain perspective.

## Impact
- Users can now clearly feel terrain ups/downs and route context in mountain-like areas.
- 3D view remains route-centric and easier to recover after manual map interactions.
