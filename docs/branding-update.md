# Branding Update (2026-03-28)

## Summary

Updated the project branding from `GoHiking` to `HikeShield` across visible frontend surfaces, shared metadata, favicon/logo assets, and internal package names.

## Updated UI Surfaces

- `frontend/src/components/Navbar.vue`
  - Brand wordmark changed to `HikeShield`
  - Logo alt text changed to `HikeShield logo`
  - Logo file reference changed to `/hikeshield-logo.svg`
- `frontend/public/hikeshield-logo.svg`
  - Added a new shield-based HikeShield SVG logo
- `frontend/src/views/Login.vue`
  - `GoHiking Account` changed to `HikeShield Account`
- `frontend/src/views/Register.vue`
  - `GoHiking Membership` changed to `HikeShield Membership`
- `frontend/src/views/ForgotPassword.vue`
  - `GoHiking Account` changed to `HikeShield Account`
- `frontend/src/views/RouteDetail.vue`
  - Shared route title changed to `HikeShield Route Plan`
- `frontend/index.html`
  - Favicon updated to use `/hikeshield-logo.svg`

## Internal Naming Updates

- Root workspace package name changed to `hikeshield`
- Frontend workspace package name changed to `hikeshield-frontend`
- Backend workspace package name changed to `hikeshield-backend`
- Root / frontend / backend lockfiles were updated to match the new package names
- Top-level `README.md`, `frontend/README.md`, and `backend/README.md` now use `HikeShield` branding

## Notes

- Visible branding now uses `HikeShield`.
- Internal package names now use lowercase `hikeshield*`.
