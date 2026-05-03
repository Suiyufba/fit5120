# Route Planner Error Position And Auto Scroll (2026-05-04)

## Summary

- Moved route planner error guidance directly under the `Plan Safe Route` and `Reset Points` actions.
- Added automatic scrolling to the error guidance when route planning or point-selection validation fails.
- Kept the long-distance and unroutable-point messages in the same route planning panel instead of surfacing them below history and map legend content.

## Frontend Surface

- Page: `frontend/src/views/RoutePlanner.vue`
- Error element: `.planner-error`
- Position: immediately below `.planner-actions`

## Behavior

- Long-distance route planning errors scroll to the guidance message under the action buttons.
- Invalid Victoria boundary clicks scroll to the same guidance area.
- Locked start/destination clicks also scroll to the same guidance area.

## Notes

- No API contract changed.
- The backend long-distance validation remains unchanged.
