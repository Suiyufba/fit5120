# Route History Clear Actions (2026-04-17)

## UI Updates
- `Your Route History` now includes:
  - `Clear All` button in the header (left of `Refresh`)
  - `Clear` button on the right side of each history row

## Behavior
- `Clear` removes only that history item.
- `Clear All` removes all history items for the current user/session.
- Buttons are disabled while corresponding delete operations are running.

## File
- `frontend/src/views/RoutePlanner.vue`
