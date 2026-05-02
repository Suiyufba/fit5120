# Route Planner Result Auto Scroll (2026-05-02)

## Change

- Updated `frontend/src/views/RoutePlanner.vue`.
- After a route is planned successfully, the planner panel automatically scrolls to the generated route result.
- Restoring a route from history also brings the result card into view.
- Added an icon-only up-arrow control in the planner panel so users can quickly return to the top inputs.

## Interfaces

- No API or route changes.
- Frontend-only behavior and UI update.

## User Impact

- Users no longer need to manually search for the generated result after planning.
- The return-to-top control improves recovery on smaller screens and longer route history panels.
