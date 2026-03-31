# Profile Update Error Handling Adjustment (2026-03-31)

## Summary

Refined frontend error handling for profile update requests so backend `404` responses are no longer always treated as missing endpoints.

## Problem

The profile page previously mapped every `404` from:

- `PUT /api/auth/profile`
- `PUT /api/auth/profile/sensitive`

into the same frontend message:

- `Profile update endpoint is not available on current backend deployment.`

This hid real backend responses such as `User not found`, which can happen when the JWT is valid syntactically but no matching account record exists in the current database.

## Frontend Changes

- File: `frontend/src/services/authApi.js`
  - Added `isProfileWritePath()` helper for shared profile-update path detection.
  - Reused the computed request URL in fetch/error reporting.
  - For profile update endpoints:
    - `401` still maps to session-expired guidance.
    - `404` with backend error `User not found` now maps to:
      - `Account record was not found. Please sign in again and try once more.`
    - `404` with another backend-provided error now surfaces that backend message directly.
    - `404` without a backend message still reports the deployment endpoint as unavailable and includes the request URL.

## Impact

- Makes profile update failures much easier to diagnose.
- Avoids misleading users into thinking the backend route is missing when the actual problem is account/session state.
- No API contract changes.
