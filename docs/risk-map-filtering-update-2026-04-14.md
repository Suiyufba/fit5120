# Risk Map Filtering Update (2026-04-14)

## Summary

Implemented User Story 2.2 filtering capabilities on the frontend Risk Map page:

- Hazard category filtering (existing capability retained)
- Date/time window filtering (new)
- Risk-level filtering (new)
- Side summary now reflects active time and risk-level filters

## What Changed

- Added `Date/Time` filter options:
  - Last 6 hours
  - Last 24 hours
  - Last 3 days
  - Last 7 days
  - All available
- Added `Risk Level` multi-select filter options:
  - Extreme
  - High
  - Moderate
  - Low
- Updated hazard rendering pipeline so map overlays and live feed only show hazards that match:
  - selected hazard layers
  - selected time window
  - selected risk levels
- Updated summary panel to show:
  - active time window
  - active risk levels
  - recalculated event counts after filters
- Popup content now includes hazard update time where available.

## Frontend Files

- `frontend/src/views/RiskMap.vue`

## API Changes

None.  
Existing `/api/hazards/realtime` endpoint and response fields were reused.  
Filtering is applied on the frontend using `updatedAt` and `severity` fields from the existing payload.
