# Profile Update Auth Fix (2026-03-31)

## Summary

Fixed profile update failures caused by transient/missing auth token in frontend runtime state and improved error clarity for profile update API calls.

## Frontend Changes

### 1) Session token persistence improvement

- In `frontend/src/services/authStore.js`:
  - Persist auth token in `sessionStorage` using key `hikeshield_auth_token`.
  - Restore token from `sessionStorage` on app load.
  - Clear token from `sessionStorage` on logout.
  - Added token extraction compatibility for payload shapes: `token`, `accessToken`, `jwt`.

### 2) Better profile update error messaging

- In `frontend/src/services/authApi.js`:
  - Network-level fetch failures now throw a clear backend connectivity error message.
  - For `/auth/profile` and `/auth/profile/sensitive`:
    - `401` maps to session-expired guidance.
    - `404` maps to backend-deployment endpoint-missing guidance.

## Impact

- Reduces unexpected `401` during profile updates after navigation/reload.
- Makes debugging much faster when backend deployment does not include the required profile endpoints.
- No API contract changes.
