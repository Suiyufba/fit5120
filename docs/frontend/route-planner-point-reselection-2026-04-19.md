# Route Planner Point Locking (2026-04-19)

## What Changed
- Updated `Plan Route` so map-selected points become locked once both start and destination have been chosen.
- Additional map clicks no longer replace either point.
- Users must use `Reset Points` before selecting a new start/destination pair.
- Added a clear panel note and inline error message to explain the locked state.

## Previous Behavior
- After both points existed, extra map clicks could still change the selected route endpoints.
- That did not match the intended locked-pair workflow for the planner.

## New Behavior
- If only one point is missing, the next map click fills the missing one.
- If both points already exist, further map clicks are ignored.
- The planner tells the user to press `Reset Points` before choosing a different pair.

## Frontend Files
- `frontend/src/views/RoutePlanner.vue`
