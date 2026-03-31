# Register Form Layout Fix (2026-03-31)

## Summary

Fixed overlap issue on the registration page where the long `Security Question` select text could visually cover the adjacent `Security Answer` field in two-column layout.

## UI Change

- In `frontend/src/views/Register.vue`, the `Security Question` form field now spans full width (`grid-column: 1 / -1`).
- This prevents select content overflow from colliding with neighboring inputs.
- Existing responsive behavior for mobile remains unchanged.

## Impact

- Better readability and interaction reliability on desktop and tablet widths.
- No API contract changes.
