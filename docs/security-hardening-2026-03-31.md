# Security Hardening Update (2026-03-31)

## Summary

This update applies core security remediations based on the security report.

## Backend Changes

### 1) Removed local admin bypass

- Deleted `LOCAL_ADMIN_TOKEN` fallback mechanism.
- Removed `local-admin` shortcut in auth/admin middlewares.
- Route planner now always loads real user profile by JWT user id.

### 2) Enforced secure environment configuration

- `AUTH_JWT_SECRET` is now required in non-test environments and must be sufficiently strong (minimum length 32).
- `CORS_ORIGIN` is now required in non-test environments and wildcard `*` is disallowed.
- `ADMIN_EMAILS` is now required in non-test environments.
- `.env.example` updated to remove real/sensitive defaults.

### 3) Added security middleware and transport protections

- Added `helmet` with CSP and secure browser headers.
- Added strict CORS allowlist mode.
- Added trusted-origin checks for non-GET requests.
- Added production HTTPS redirect behavior (when behind proxy with `x-forwarded-proto`).
- Added global unhandled error middleware returning generic 500 message.

### 4) Added auth endpoint rate limiting

- Added `express-rate-limit` to:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/password-reset/security`

### 5) Strengthened auth rules

- Password policy upgraded: minimum 12 characters and must include uppercase, lowercase, number, and special character.
- Applied to register, password reset, and sensitive profile updates.
- Security question comparison is now case-insensitive normalization.
- Added password-reset lockout (in-memory): 3 failed attempts -> 1 hour lock.
- Auth payload now returns `user.isAdmin` derived from configured admin email allowlist.

### 6) Input validation hardening

- `GET /api/knowledge/articles` topic filter is now validated against allowlist.
- `GET /api/hazards` now validates `bbox` and `layers` query parameters.
- Community report `imageUrl` now validates protocol and blocks localhost/private-network hosts.

### 7) SQL injection mitigation

- Knowledge article dynamic table query now validates and sanitizes table identifier before SQL interpolation.

## Frontend Changes

### 1) Removed hardcoded admin credentials and local admin login

- Deleted client-side `admin / 123456` login path.
- Deleted local admin token session logic.

### 2) Reduced token exposure risk

- Removed `localStorage` token persistence from auth store.
- Session token is memory-only in current implementation.
- Added client-side JWT expiry check in auth restore flow.

### 3) Admin route authorization tightening

- `/admin-dashboard` now requires authenticated admin user (`user.isAdmin`), not only logged-in state.

### 4) UI-level auth policy alignment

- Updated password minimum length in login/register/forgot-password/profile sensitive forms to 12.
- Updated default security questions to less guessable options.

### 5) Environment example cleanup

- `frontend/.env.example` now uses placeholder backend domain.
- Frontend API fallback URL switched to `http://localhost:8080/api`.

## API Behavior Notes

- Auth write endpoints are now rate-limited and may return 429 when threshold is exceeded.
- Requests from non-allowlisted origins for state-changing methods will return 403.
- Invalid `topic`, `bbox`, or `layers` values now return 400.
- Auth responses now include `user.isAdmin`.

## Required Deployment Environment Variables

Set these in production before startup:

- `AUTH_JWT_SECRET` (32+ chars random secret)
- `CORS_ORIGIN` (single or comma-separated trusted frontend origins)
- `ADMIN_EMAILS` (comma-separated admin emails)
