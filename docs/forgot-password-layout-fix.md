# Forgot Password Layout Fix (2026-03-31)

## Summary

Fixed overflow on the forgot-password form where long `Security Question` option text could expand the form grid width and push controls beyond the card boundary.

## UI Changes

- In `frontend/src/views/ForgotPassword.vue`:
  - Set `.forgot-form` grid to a constrained single column: `grid-template-columns: minmax(0, 1fr)`.
  - Set `input`, `select`, and `button` width to `100%`.

## Impact

- Form controls now remain inside the card container at desktop and mobile sizes.
- No API changes.
