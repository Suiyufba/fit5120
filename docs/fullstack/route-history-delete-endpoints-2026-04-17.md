# Route History Delete Endpoints (2026-04-17)

## Added APIs
- `DELETE /api/routes/history/:id`
  - Deletes a single route history record owned by current user/session.
- `DELETE /api/routes/history`
  - Clears all route history records for current user/session.

## Ownership Rules
- Signed-in users: matched by `user_id`.
- Anonymous users: matched by `X-Plan-Session-Id`.
- If both are present, either owner match is accepted.

## Backend Files
- `backend/src/modules/routes/repositories/routePlanHistoryRepository.js`
- `backend/src/controllers/routePlannerController.js`
- `backend/src/routes/routePlannerRoutes.js`

## Frontend Integration
- `frontend/src/services/routeApi.js`
- `frontend/src/views/RoutePlanner.vue`
