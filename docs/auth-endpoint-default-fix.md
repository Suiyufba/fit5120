# Auth Endpoint Default Fix (2026-03-31)

## Summary

Fixed login request failure caused by frontend default API base URL pointing to local backend (`http://localhost:8080/api`) in non-local environments.

## Changes

- Updated auth API default base URL back to Railway backend:
  - `frontend/src/services/authApi.js`
- Updated admin API default base URL for consistency:
  - `frontend/src/services/adminApi.js`

## Current Behavior

- If `VITE_HAZARD_API_BASE_URL` is configured, frontend uses that value.
- If not configured, frontend now falls back to:
  - `https://backend-production-f55c.up.railway.app/api`

## Impact

- Login no longer attempts `localhost:8080` by default on deployed/frontend-only environments.
- Prevents `Failed to fetch` / `ERR_CONNECTION_REFUSED` from wrong default endpoint.
