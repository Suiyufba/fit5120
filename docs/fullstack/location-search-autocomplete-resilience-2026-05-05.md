# Location Search Autocomplete Resilience (2026-05-05)

## What Changed
- Fixed Plan Route destination autocomplete failing when rapid typing caused repeated location-search requests.
- Added a 350ms frontend debounce for both start and destination location inputs.
- Added backend search-result caching for `/api/locations/search`.
- Added Photon geocoding as a fallback when the primary Nominatim search provider is rate-limited or unavailable.
- The location-search endpoint now returns an empty result list instead of surfacing upstream geocoder failures as browser-visible 500 errors.

## Interfaces
- `GET /api/locations/search?q=<text>&limit=<n>`
  - Existing request/response shape remains unchanged.
  - The endpoint now has in-memory caching and a fallback provider behind the same interface.

## Files
- `frontend/src/views/RoutePlanner.vue`
- `backend/src/modules/locations/services/locationSearchService.js`
