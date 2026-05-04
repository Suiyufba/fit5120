# mapcn-Inspired Map UI Upgrade (2026-05-04)

## Summary

- Upgraded the main map surfaces with a mapcn-inspired visual treatment while keeping the existing Vue and Leaflet implementation.
- Extended the same map treatment across Risk Map, Route Planner, Community Reports, and the Home live risk preview.
- Added shared selectable basemap styles:
  - `Clean` / CARTO Voyager
  - `Light` / CARTO Positron
  - `Trail` / OpenTopoMap
- Added floating map controls for zooming, recentering, and fitting the current route/selection.
- Unified the third floating control across the map surfaces as a current-location toggle:
  - First click requests browser geolocation and flies to the user's current position when it is inside Victoria.
  - Second click returns to the full Victoria map view.
  - All upgraded maps use the same icon, label, and location marker treatment.
- Added compact map status pills:
  - Risk Map shows the live hazard count.
  - Route Planner shows the next point-selection state.
- Refined hazard popups with a softer glass panel style.

## Updated Files

- `frontend/src/utils/mapVisualStyles.js`
- `frontend/src/components/HomeRiskPreviewMap.vue`
- `frontend/src/views/RiskMap.vue`
- `frontend/src/views/RoutePlanner.vue`
- `frontend/src/views/CommunityReports.vue`

## Notes

- `mapcn` itself targets React, shadcn/ui, Tailwind CSS, and MapLibre GL. This project currently uses Vue with Leaflet for Risk Map and Route Planner, so the upgrade ports the component library's interaction and visual patterns instead of introducing a React-only dependency.
- Existing hazard loading, Victoria map bounds, route planning, marker rendering, and popup data remain unchanged.
