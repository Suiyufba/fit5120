# Risk Category Visibility Update (2026-04-14)

## Summary

Improved hazard classification visibility so users can see concrete risk categories instead of only broad type labels such as `other`.

This update keeps existing layer filtering (`fire/flood/storm/heat/other`) while adding a specific `riskCategory` field end-to-end.

## What Changed

- Backend now preserves and returns `riskCategory` in hazard records.
  - VicEmergency: from incident type/category
  - DataVic/VicRoads: from event type/subcategory
  - OpenWeather hazards: explicit category labels (heatwave, strong wind, heavy rain, freezing conditions)
- Frontend now parses `riskCategory` and displays it in:
  - Risk Map marker popup
  - Risk Map feed item subtitle
  - Location Detail panel (`Risk category` field)
- Location navigation now includes `category` in route query params so detail page can consistently show specific risk labels.

## Backend Files

- `backend/src/modules/hazards/domain/hazardUtils.js`
- `backend/src/modules/hazards/adapters/vicEmergencyAdapter.js`
- `backend/src/modules/hazards/adapters/vicRoadsAdapter.js`
- `backend/src/modules/hazards/adapters/bomAdapter.js`

## Frontend Files

- `frontend/src/services/hazardApi.js`
- `frontend/src/views/RiskMap.vue`
- `frontend/src/views/LocationDetail.vue`

## API Notes

No new endpoint added.  
Existing realtime endpoint payload now includes `riskCategory` on hazard objects where source data provides it.
