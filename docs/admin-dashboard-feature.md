# Admin Dashboard Feature + API (2026-03-28)

## Summary

Implemented an authenticated admin dashboard to manage:

- Unified map operations for both manual risks and community reports
- User account operations
- User edit operations for email, region, experience level, and assessment score
- KnowledgeHub article operations
- KnowledgeHub article edit operations
- Visual map-based risk editing for admins (click/select/edit/remove on map)
- Overview card `Risks` now shows `manual hazards + official hazard snapshot` total
- Dashboard map shows official hazards again as read-only context, while editable items remain manual risks and community reports

## Frontend Changes

- New page: `frontend/src/views/AdminDashboard.vue`
  - Tab modules: `Map Ops`, `Users`, `KnowledgeHub`
  - Map Ops supports mixed management of manual risks and community reports
  - Supports create/update/delete directly from one map-linked editor
  - Supports list/delete users
  - Supports create/delete knowledge articles
- New service: `frontend/src/services/adminApi.js`
  - Added API wrappers for all admin endpoints
- New route: `/admin-dashboard` (requires auth)
  - Added in `frontend/src/router/index.js`
- Navbar update
  - Adds `Dashboard` entry for authenticated users
  - Updated in `frontend/src/components/Navbar.vue`

## Backend Changes

- New admin middleware:
  - `backend/src/modules/auth/middlewares/requireAdmin.js`
  - Validates current user email against `ADMIN_EMAILS`
- Config update:
  - `backend/src/config/index.js` adds `adminEmails`
  - Default includes `1178804854@qq.com`
- New admin controller and routes:
  - `backend/src/controllers/adminController.js`
  - `backend/src/routes/adminRoutes.js`
- Manual risk persistence for Risk Map:
  - `backend/src/modules/hazards/repositories/manualHazardRepository.js`
  - Merged into realtime hazard output in `hazardAggregator`
- Community report moderation support:
  - Added soft-delete support in community report repository
- User management support:
  - Added list/delete repository methods
- Knowledge article management support:
  - Added list/create/update/delete methods in article repository

## API Contract

All endpoints below require:

- `Authorization: Bearer <token>`
- Admin identity (`ADMIN_EMAILS` allow list)

Base path: `/api/admin`

### Overview

- `GET /overview`
  - Returns high-level counts for dashboard cards
  - `risks` count includes both editable manual hazards and official hazard snapshot items
  - Frontend keeps compatibility with older payloads that still return `manualRisks`

### Manual Risks

- `GET /risks`
- `POST /risks`
  - Body: `title`, `description`, `type`, `severity`, `latitude`, `longitude`
- `PUT /risks/:id`
  - Update an existing manual risk (including type/severity/title/description/coordinates)
- `DELETE /risks/:id`
  - Archives a manual risk

### Community Reports

- `GET /community-reports`
- `POST /community-reports`
- `PUT /community-reports/:id`
- `DELETE /community-reports/:id`

### Users

- `GET /users`
- `PUT /users/:id`
  - Update `email`, `region`, `experienceLevel`, `assessmentScore`
- `DELETE /users/:id`

### Knowledge Articles

- `GET /knowledge/articles`
- `POST /knowledge/articles`
- `PUT /knowledge/articles/:id`
- `DELETE /knowledge/articles/:id`

## Notes

- Manual risks are stored in `manual_hazards` and automatically shown through existing realtime hazard API flow.
- Dashboard route is auth-protected at frontend and admin-protected at backend.
- Map Ops tab now includes a visual map editor:
  - explicit mode switch: `Create` / `Modify`
  - admin map now shows only editable manual risks and community reports
  - removed official read-only hazards from dashboard map to avoid confusion during modify flow
  - displays editable item count and an empty-state hint when there is nothing to modify
  - click map to set draft point
  - click existing marker (risk or report) to edit
  - in `Modify` mode, map click now supports larger-radius nearest-marker selection fallback
  - in `Modify` mode, if no marker is hit, map click now auto-selects the nearest editable item
  - marker selection now listens to click/mousedown/touchstart for more reliable interaction
  - adds larger transparent marker hit-areas for easier selection on dense maps
  - map-level mousedown/touchstart also trigger modify-selection (not only click)
  - drag existing marker (risk or report) to update coordinates
  - save/remove directly from unified map-linked form
- Added frontend local admin shortcut login:
  - Username: `admin`
  - Password: `123456`
  - After successful sign-in, user is redirected to `/admin-dashboard`.
- Backend now accepts `LOCAL_ADMIN_TOKEN` (default `local-admin-token`) for the local admin shortcut,
  so dashboard refresh/admin API operations do not return Unauthorized for that mode.
