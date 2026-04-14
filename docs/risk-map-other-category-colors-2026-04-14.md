# Risk Map Other-Category Color Update (2026-04-14)

## Summary

Improved Risk Map visualization for hazards classified under `other`.

Instead of showing all `other` hazards in one static color, the map now dynamically assigns distinct colors by concrete risk category (`riskCategory`), so users can better distinguish different types of non-core hazards.

## What Changed

- Added dynamic color assignment for `other` hazards based on category key hashing.
- Marker circles and risk-zone overlays now use category-specific colors for `other` records.
- Added `Other Categories` subsection under Hazard Layers:
  - shows each dynamic category label
  - shows category color
  - shows current visible count per category
- Feed item subtitle now surfaces category + source.
- Marker popup continues to show explicit `Category` details.

## Frontend Files

- `frontend/src/views/RiskMap.vue`

## API Changes

None.
