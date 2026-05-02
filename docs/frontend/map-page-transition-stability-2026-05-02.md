# Map Page Transition Stability (2026-05-02)

## Change

- Updated `frontend/src/router/index.js`.
- Added `stableMapView` route metadata to:
  - `/risk-map`
  - `/route-planner`
  - `/community-reports`
- Updated `frontend/src/App.vue` so stable map pages use a fade-only route transition.

## Interfaces

- No API or backend route changes.
- Frontend-only navigation and animation update.

## User Impact

- Switching between Risk Map, Plan Route, and Community Reports no longer moves the whole map up/down during page transitions.
- Regular non-map pages keep the existing page transition.
