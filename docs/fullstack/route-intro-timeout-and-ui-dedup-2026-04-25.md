# Route Intro Timeout And UI Dedup (2026-04-25)

## Summary

- Added a timeout guard for Gemini route-introduction generation so route planning does not wait indefinitely on external AI responses.
- Reduced duplicate text in route summary/detail UI by showing a single narrative paragraph.

## Backend Changes

- File: `backend/src/modules/routes/services/routeNarrationService.js`
- Added `GEMINI_ROUTE_NARRATION_TIMEOUT_MS` support (default `4500` ms).
- Wrapped Gemini `fetch` request with `AbortController` timeout.
- Timeout or request errors continue to fall back to rule-based introduction text.

## Frontend Changes

- File: `frontend/src/views/RoutePlanner.vue`
  - Keep one summary paragraph: `intro` (fallback to `explanation`).
- File: `frontend/src/views/RouteDetail.vue`
  - Keep one detail paragraph: `intro` (fallback to `explanation`).

## Environment

- File: `.env.example`
- Added:
  - `GEMINI_ROUTE_NARRATION_TIMEOUT_MS=4500`

## API Impact

- No API contract change.
- Existing `intro` and `explanation` response fields remain unchanged.
