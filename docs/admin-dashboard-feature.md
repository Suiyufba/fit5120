# Admin Dashboard Feature + API (2026-03-28)

## Summary

Implemented an authenticated admin dashboard to manage:

- Manual risk overlays on Risk Map
- Community reports moderation
- User account operations
- KnowledgeHub article operations

## Frontend Changes

- New page: `frontend/src/views/AdminDashboard.vue`
  - Tab modules: `Risk Map`, `Community Reports`, `Users`, `KnowledgeHub`
  - Supports create/archive manual risk
  - Supports delete community report
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

### Manual Risks

- `GET /risks`
- `POST /risks`
  - Body: `title`, `description`, `type`, `severity`, `latitude`, `longitude`
- `DELETE /risks/:id`
  - Archives a manual risk

### Community Reports

- `GET /community-reports`
- `DELETE /community-reports/:id`

### Users

- `GET /users`
- `DELETE /users/:id`

### Knowledge Articles

- `GET /knowledge/articles`
- `POST /knowledge/articles`
- `PUT /knowledge/articles/:id`
- `DELETE /knowledge/articles/:id`

## Notes

- Manual risks are stored in `manual_hazards` and automatically shown through existing realtime hazard API flow.
- Dashboard route is auth-protected at frontend and admin-protected at backend.
