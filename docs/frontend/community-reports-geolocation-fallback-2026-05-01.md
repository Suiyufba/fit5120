# Community Reports Geolocation Fallback - 2026-05-01

## Summary

Hardened the `Use My Location` flow on the Community Reports page so transient
macOS CoreLocation failures (`kCLErrorLocationUnknown`) no longer immediately
surface as user-facing errors.

## Changes

- File: `frontend/src/views/CommunityReports.vue`
- Replaced the single retry with a three-step attempt ladder:
  1. High-accuracy lookup (8s timeout, fresh fix preferred).
  2. Low-accuracy retry (12s timeout, allow ~5min cached fix).
  3. Last-chance attempt (15s timeout, accept any cached fix via
     `maximumAge: Infinity`).
- Permission-denied errors still abort immediately on the first failure.
- Adds a 600 ms backoff between attempts so CoreLocation has time to
  recover after a transient `kCLErrorLocationUnknown`.
- User-facing error messages now point users at macOS Location Services
  settings and the address search / map-click fallbacks.

## Context

Chrome on macOS occasionally logs
`CoreLocationProvider: ... kCLErrorLocationUnknown` when CoreLocation cannot
resolve a position on the first try. Those console lines come from the
browser/system geolocation provider, not our backend. The previous one-shot
retry could still bubble up the failure even when a second or third attempt
would have succeeded with a cached fix.
