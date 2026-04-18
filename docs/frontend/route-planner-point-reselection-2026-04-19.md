# Route Planner Point Reselection (2026-04-19)

## What Changed
- Updated `Plan Route` so users can keep editing start and destination after both points have already been selected.
- Added explicit `Pick on map` controls on both point cards.
- Map clicks now update the actively selected field instead of forcing a full reset.

## Previous Behavior
- After both points existed, another map click shifted the old destination into the start slot and used the new click as destination.
- That made it hard to intentionally replace only the start point or only the destination point.

## New Behavior
- If only one point is missing, the next map click fills the missing one.
- If both points already exist, the next map click updates whichever field is currently active:
  - `Start`
  - `Destination`
- Focusing an input also switches the active map target.

## Frontend Files
- `frontend/src/views/RoutePlanner.vue`
