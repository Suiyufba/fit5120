# Route Plan History Storage (2026-04-17)

## Goal
- Persist each user's route plans into PostgreSQL and expose history in UI.
- Identity source:
  - signed-in user: JWT user id
  - anonymous user: browser session id header

## Backend Changes
- New table store:
  - file: `backend/src/modules/routes/repositories/routePlanHistoryRepository.js`
  - table: `route_plan_history`
  - columns: `user_id`, `session_id`, `start_point`, `end_point`, `plan_payload`, `created_at`
  - indexes on user/session + created time
- New auth middleware:
  - file: `backend/src/modules/auth/middlewares/optionalAuth.js`
  - reads optional Bearer token and sets `req.auth.userId` when valid
- Route planner APIs:
  - file: `backend/src/routes/routePlannerRoutes.js`
  - `POST /api/routes/plan` uses `optionalAuth`, plans route, then stores history row
  - `GET /api/routes/history` returns per-user/per-session history rows
- Controller updates:
  - file: `backend/src/controllers/routePlannerController.js`
  - supports `X-Plan-Session-Id` for anonymous identity
- Server bootstrap:
  - file: `backend/src/server.js`
  - initializes route history store
  - allows `X-Plan-Session-Id` in CORS headers

## Frontend Integration
- `Plan Route` sends `X-Plan-Session-Id` on plan and history fetch.
- UI history panel loads and restores previous plans.

## Railway / PostgreSQL Note
- Data is written to PostgreSQL when `DATABASE_URL` is configured (Railway setup).
