# Map Page Transition Stability (2026-05-02)

## Change

- Updated `frontend/src/router/index.js`.
- Added `stableMapView` route metadata to:
  - `/risk-map`
  - `/route-planner`
  - `/community-reports`
- Updated `frontend/src/App.vue` so stable map pages use a fade-only route transition.
- Updated shared Victoria map constraints in `frontend/src/utils/victoriaMap.js` to avoid Leaflet's animated `_panInsideMaxBounds` initialization path.
- Disabled Leaflet zoom/fade animations during initial map setup on the three map pages.

## Interfaces

- No API or backend route changes.
- Frontend-only navigation and animation update.

## User Impact

- Switching between Risk Map, Plan Route, and Community Reports no longer moves the whole map up/down during page transitions.
- Leaflet's internal map pane now initializes at its final position instead of animating vertically after route changes.
- Regular non-map pages keep the existing page transition.
