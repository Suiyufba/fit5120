# Route Planner: Difficulty Label Alignment (2026-04-18)

## Goal
- Fix inconsistent difficulty labels between `RoutePlanner` and `RouteDetail`.

## Root Cause
- `RoutePlanner` displayed slot labels (`Easy / Moderate / Hard`) from route-option placement logic.
- `RouteDetail` displayed the actual backend-calculated route difficulty.
- This made the same route appear as `Easy` in planner and `Hard` in detail.

## Changes
- Updated `frontend/src/views/RoutePlanner.vue`.
- Route cards now show neutral labels (`Route 1`, `Route 2`, `Route 3`) instead of slot difficulty labels.
- Route cards display the real route difficulty in metadata.
- Planner summary `Difficulty` now uses the selected route's real `difficulty` field.

## Impact
- Route difficulty is now consistent between planner and detail pages.
- Users no longer see misleading difficulty labels created by route option slotting.
