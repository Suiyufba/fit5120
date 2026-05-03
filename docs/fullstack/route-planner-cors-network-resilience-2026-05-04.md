# Route Planner CORS And Network Resilience (2026-05-04)

## Summary

- Added an early backend CORS header guard so allowed frontend origins receive CORS headers even on error paths before route handlers finish.
- Updated the route planner frontend API client to convert browser `Failed to fetch` / transient network failures into a clear retry message.

## Why

A route planning request from `https://www.gohiking.me` briefly showed:

- backend `POST /api/routes/plan` returned `400`,
- browser then reported missing `Access-Control-Allow-Origin`,
- frontend surfaced `Failed to fetch`.

Current Railway configuration already includes `https://www.gohiking.me`, and live curl checks confirmed normal `400` responses include CORS headers. The extra backend guard reduces risk during edge cases such as rolling deploys or early middleware errors.

## User-Facing Message

```text
The route service connection was interrupted. Please try Plan Safe Route again in a moment.
```

## Notes

- No API endpoint changed.
- No frontend environment variable changed.
- This does not affect Gemini or AI assistant generation.
