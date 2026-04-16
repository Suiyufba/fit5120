# Location Detail Panel Integration (2026-04-14)

## Summary

Implemented User Story 2.3 end-to-end from the Risk Map:

- Click a highlighted risk area to open the Location Detail Panel
- Show core location risk detail fields
- Show related nearby community reports when available

## What Changed

- Risk Map marker/feed click now navigates to dynamic location detail route:
  - `/location/:id`
  - passes selected hazard context in route query
- Replaced static `LocationDetail` page with dynamic data-driven panel:
  - location name
  - risk type
  - risk level
  - affected time window
  - recommended action
  - source + hazard description
- Added related community report section:
  - loads reports via existing community reports API
  - matches nearby reports by distance from selected hazard location
  - displays report title, type, severity, time, location, reporter, description, and image when present

## Frontend Files

- `frontend/src/views/RiskMap.vue`
- `frontend/src/views/LocationDetail.vue`

## API Changes

None.  
Existing endpoints reused:

- `/api/hazards/realtime`
- `/api/community-reports`
