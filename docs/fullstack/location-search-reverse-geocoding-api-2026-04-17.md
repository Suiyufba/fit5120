# Location Search & Reverse Geocoding API (2026-04-17)

## Goal
- Improve Route Planner UX beyond raw coordinates.
- Support:
  - text input with similar location matching
  - reverse place name lookup when user clicks map

## Backend Changes
- New service:
  - `backend/src/modules/locations/services/locationSearchService.js`
  - Uses Nominatim (OSM) for search + reverse lookup.
  - Applies Victoria bounding filter to results.
- New controller:
  - `backend/src/controllers/locationController.js`
- New routes:
  - `GET /api/locations/search?q=<text>&limit=<n>`
  - `GET /api/locations/reverse?lat=<lat>&lng=<lng>`
  - route file: `backend/src/routes/locationRoutes.js`
- Route registration:
  - `backend/src/routes/index.js`

## Frontend Integration
- `RoutePlanner` uses backend location APIs for suggestions and reverse labels.

## API Contract
- Search response:
  - `{ results: [{ displayName, lat, lng }] }`
- Reverse response:
  - `{ result: { displayName, lat, lng } | null }`
