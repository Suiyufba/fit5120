# Public Access Update for Route Planner + Community Reports (2026-04-16)

Temporarily removed sign-in enforcement for Route Planner and Community Report features so users can use them without logging in.

## Frontend changes

- Updated router auth guards in `frontend/src/router/index.js`:
  - Removed `requiresAuth` from:
    - `/route-planner`
    - `/route-detail`
    - `/community-reports`
    - `/report-hazard`
- Updated navbar account button in `frontend/src/components/Navbar.vue`:
  - When user is not logged in, clicking `Sign In` now does nothing (no redirect).
- Removed token coupling in these views/services:
  - `frontend/src/views/RoutePlanner.vue`
  - `frontend/src/views/RouteDetail.vue`
  - `frontend/src/views/CommunityReports.vue`
  - `frontend/src/views/ReportHazard.vue`
  - `frontend/src/services/routeApi.js` now only sends `Authorization` header when token exists.

## Backend changes

- Updated route planner route in `backend/src/routes/routePlannerRoutes.js`:
  - `POST /api/routes/plan` no longer requires `requireAuth`.
- Updated route planner controller/service:
  - `backend/src/controllers/routePlannerController.js` now tolerates missing `req.auth`.
  - `backend/src/modules/routes/services/routePlannerService.js`:
    - Uses user profile when authenticated.
    - Falls back to `newcomer` user level when unauthenticated.
- Updated community report route in `backend/src/routes/communityReportsRoutes.js`:
  - `POST /api/community-reports` no longer requires `requireAuth`.

## API behavior after update

- `POST /api/routes/plan`
  - Auth optional.
  - Without login, route scoring defaults to `userLevel = newcomer`.
- `POST /api/community-reports`
  - Auth optional.
  - Guests can submit reports directly.
