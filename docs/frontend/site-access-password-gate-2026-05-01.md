# Site Access Password Gate - 2026-05-01

## Summary

The frontend now displays a full-screen access gate before rendering the main Vue app.

## Behavior

- File: `frontend/src/App.vue`
- Password: `gkd` by default
- Optional override: `VITE_SITE_ACCESS_PASSWORD`
- Successful entry stores `hikeshield_site_access_granted=true` in `localStorage`
- The app navbar and router view are not rendered until the password is accepted

## Notes

This is a client-side preview gate for a private deployment, not a replacement for server-side authentication. The existing account login and protected routes remain unchanged.
