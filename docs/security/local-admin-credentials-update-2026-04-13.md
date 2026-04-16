# Local Admin Credentials Update (2026-04-13)

## Summary

Updated local admin shortcut credentials to:

- Email: `admin@123.com`
- Password: `abcde!123456`

## Backend Changes

- Updated `backend/src/config/index.js`:
  - Added configurable local admin settings with defaults:
    - `LOCAL_ADMIN_ENABLED` (default: `true`)
    - `LOCAL_ADMIN_EMAIL` (default: `admin@123.com`)
    - `LOCAL_ADMIN_PASSWORD` (default: `abcde!123456`)
    - `LOCAL_ADMIN_USER_ID` (default: `local-admin`)
- Updated `backend/src/modules/auth/services/authService.js`:
  - Added local admin credential login path in `loginUser`.
  - Added local admin fallback in `getProfileByUserId` so `/api/auth/me` works for this session.
  - Marked local admin as `isAdmin: true` through admin-email detection logic.
- Updated `backend/src/modules/auth/middlewares/requireAdmin.js`:
  - Allows `LOCAL_ADMIN_USER_ID` to pass admin authorization directly.

## API Behavior Notes

- `POST /api/auth/login` now accepts local admin shortcut credentials and returns JWT + admin user payload.
- Existing database user login behavior is unchanged.
