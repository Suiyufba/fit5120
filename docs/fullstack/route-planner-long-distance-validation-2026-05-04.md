# Route Planner Long Distance Validation (2026-05-04)

## Summary

- Added a backend pre-check for route planning requests where start and destination are too far apart for a hiking route.
- Requests with a direct point-to-point distance greater than `80 km` now return a `400` user-input error before calling OpenRouteService.
- Updated frontend error handling so OpenRouteService routing failures are shown as actionable route-selection guidance instead of raw provider errors.

## Why

OpenRouteService can return `400` when:

- the requested walking/hiking route is far beyond practical route-planning distance,
- a clicked point is not close enough to the routable road or trail network,
- or the provider cannot connect both points with the requested travel profiles.

Previously, these provider `400` errors were surfaced through the backend as a `503`, which made a point-selection problem look like a service outage.

## User Guidance

Frontend now tells users to:

- choose closer start and destination points for hiking routes,
- keep both points on the same trail area or within `80 km`,
- and move points closer to mapped roads or walking tracks if routing still fails.

## Notes

- This does not affect Gemini or the AI assistant reminder.
- The existing OpenRouteService profile fallback behavior remains unchanged.
