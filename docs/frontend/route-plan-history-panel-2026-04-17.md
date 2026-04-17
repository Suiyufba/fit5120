# Route Plan History Panel (2026-04-17)

## Background
- Add per-user/per-session route plan history to `Plan Route`.
- Users can quickly reload a previous route plan.

## Frontend Changes
- File: `frontend/src/services/routeApi.js`
  - Added `getOrCreatePlanSessionId()` to persist a browser session identifier.
  - Added `fetchRoutePlanHistory()` API call.
  - `planSafeRoute()` now sends `X-Plan-Session-Id`.
- File: `frontend/src/views/RoutePlanner.vue`
  - Added **Your Route History** panel.
  - Added refresh action and loading state.
  - Added click-to-load history item flow to restore:
    - start/end points
    - route plan payload
    - selected route + map rendering
  - Route planning now passes auth token (if signed in) and refreshes history after saving.

## UX Result
- Signed-in users see their own history based on user id.
- Anonymous users still have history based on browser session id.
