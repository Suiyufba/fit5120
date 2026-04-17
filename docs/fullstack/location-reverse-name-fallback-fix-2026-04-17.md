# Location Reverse Name Fallback Fix (2026-04-17)

## Backend
- Improved reverse geocoding result normalization:
  - supports fallback display name composition from address fields
  - retries with broader zoom levels when detailed lookup fails
  - returns a human-friendly fallback name (`Dropped pin location`) instead of raw coordinates

## Frontend
- Route planner input behavior updated to better support typing flow:
  - auto-clear on focus
  - no duplicate label line

## Files
- `backend/src/modules/locations/services/locationSearchService.js`
- `frontend/src/views/RoutePlanner.vue`
