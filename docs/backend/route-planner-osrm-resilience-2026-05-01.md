# Route Planner OSRM Resilience Update - 2026-05-01

## Background

`POST /api/routes/plan` intermittently failed when OSRM public endpoint returned transient upstream errors such as:

```text
HTTP 502 from https://router.project-osrm.org/route/v1/foot/...
```

When this occurred, route planning failed immediately with HTTP 500 and no retry path.

## Changes

Updated `backend/src/modules/routes/adapters/osrmAdapter.js` to make OSRM calls resilient:

- Added transient-status detection for `429`, `500`, `502`, `503`, `504`.
- Added bounded retry on transient failures (`2` attempts per profile, `300ms` delay).
- Added profile fallback chain:
  - Primary: configured `OSRM_ROUTE_PROFILE` (current default `foot`)
  - Secondary fallback: `walking`
  - Tertiary fallback: `driving`
- Added normalized final error message:

```text
OSRM route service unavailable (...)
```

This keeps upstream temporary instability from failing route planning at first error and provides a clearer service-level failure message if all attempts fail.

## Tests

Added `backend/src/modules/routes/adapters/osrmAdapter.test.js`:

- `fetchOsrmRoutes retries transient 502 on same profile`
- `fetchOsrmRoutes falls back to secondary profile when primary keeps failing`

Backend test command:

```bash
cd backend
npm test
```

Result on change day: all tests passed (33/33).
