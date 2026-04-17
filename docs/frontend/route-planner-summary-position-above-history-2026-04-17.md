# Route Planner: Move Choose-One-Route Above History (2026-04-17)

## Goal
- Reorder Route Planner panel blocks for better flow.
- Place `Choose One Route` directly below `Reset Points`, and above `Your Route History`.

## Changes
- Updated template order in:
  - `frontend/src/views/RoutePlanner.vue`
- New order inside panel:
  - Planner actions (`Plan Safe Route`, `Reset Points`)
  - Route summary selector (`Choose One Route`)
  - Route history panel (`Your Route History`)

## Impact
- Users can select one of the planned routes immediately after planning/reset controls, before reviewing history.
