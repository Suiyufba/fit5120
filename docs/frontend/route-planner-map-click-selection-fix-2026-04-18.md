# Route Planner Map Click Selection Fix (2026-04-18)

## What Changed
- Fixed a map-click selection issue on `Plan Route` where the chosen point could shift away from the user's actual click.
- Reverse geocoding now provides only the readable place name.
- The clicked latitude and longitude remain the source of truth for start and destination markers.
- Added a stable selected-location display under each input card so the left panel shows:
  - place name
  - exact selected coordinates

## Root Cause
- The planner previously used reverse-geocoding results to overwrite the clicked coordinates.
- Some reverse results resolve to a nearby place center rather than the exact clicked map position.
- That caused occasional mismatch between the visual click location and the stored route-planning point.

## Frontend Files
- `frontend/src/views/RoutePlanner.vue`

## Result
- Clicking the map now keeps the marker anchored to the exact selected point.
- Users can still see a human-readable place name in the left panel after selecting a point.
