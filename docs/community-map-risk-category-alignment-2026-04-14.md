# Community Map Risk Category Alignment (2026-04-14)

## Summary

Improved community map popups to show concrete risk category details instead of generic `other`, and aligned hazard type handling with Route Planner categories.

## What Changed

- Frontend hazard type normalization now recognizes `trail`-related keywords.
- Community Reports map hazard popup now shows:
  - specific category label (`riskCategory`)
  - severity
  - report description for community markers
- Hazard layer requests now include `trail` in:
  - Community Reports page
  - Risk Map page
  - Route Planner page
  - Route Detail page
- Category palette and marker visuals remain consistent with existing risk map behavior.

## Frontend Files

- `frontend/src/services/hazardApi.js`
- `frontend/src/views/CommunityReports.vue`
- `frontend/src/views/RiskMap.vue`
- `frontend/src/views/RoutePlanner.vue`
- `frontend/src/views/RouteDetail.vue`

## API Changes

No endpoint changes.  
Existing `/api/hazards/realtime` response fields are reused (`type`, `riskCategory`, `description`, `severity`).
