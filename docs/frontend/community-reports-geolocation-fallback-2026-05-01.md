# Community Reports Geolocation Fallback - 2026-05-01

## Summary

Improved the `Use My Location` flow on the Community Reports page when browser geolocation is temporarily unavailable.

## Changes

- File: `frontend/src/views/CommunityReports.vue`
- First tries high-accuracy geolocation.
- If the device returns a transient location failure, retries once with normal accuracy and a longer timeout.
- Permission-denied errors still stop immediately.
- User-facing errors now distinguish:
  - permission denied
  - device location unavailable
  - lookup timeout
  - generic geolocation failure

## Context

Chrome on macOS can log `CoreLocationProvider: ... kCLErrorLocationUnknown` when CoreLocation cannot resolve a position. That console log is browser/system geolocation noise, not a backend API failure.
