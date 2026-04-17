# Route Planner Location Input + Suggestions (2026-04-17)

## What Changed
- `Plan Route` now supports both map-click and text-based location input.
- Users can type start/destination and see similar location suggestions.
- Selecting a suggestion sets the map point directly.
- Clicking on the map now reverse-resolves a readable location name and shows it in the card.

## Frontend Files
- `frontend/src/views/RoutePlanner.vue`
  - Added start/destination input fields.
  - Added suggestion lists and selection handlers.
  - Added reverse-lookup integration for map clicks.
  - Point display now shows `Location Name (lat, lng)`.
- `frontend/src/services/locationApi.js`
  - Added location search + reverse API client.
