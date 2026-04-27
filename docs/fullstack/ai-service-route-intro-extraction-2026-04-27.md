# AI Service Route Intro Extraction (2026-04-27)

## Summary

- Extracted route-introduction AI generation from the main backend into a dedicated `ai-service`.
- Main backend no longer calls Gemini directly for route introductions.
- Main backend now calls internal `ai-service` endpoint and falls back to rule-based text when unavailable.

## New Service API

- Service: `ai-service` (Railway service)
- Endpoint: `POST /v1/route-introduction`
- Request:
  - `{ "route": { ...routePayload } }`
- Response:
  - `{ "intro": "Generated or fallback introduction text" }`
- Health check:
  - `GET /health`

## Security

- Added optional shared token auth for `ai-service`:
  - Header: `x-ai-service-token`
  - Env: `AI_SERVICE_AUTH_TOKEN`
- Recommended deployment:
  - Keep `ai-service` private/internal on Railway.
  - Only allow main backend to call it.
  - Keep Gemini key only in `ai-service` environment.

## Backend Changes

- File: `backend/src/modules/routes/services/routeNarrationService.js`
  - Replaced direct Gemini call with HTTP call to `AI_SERVICE_URL`.
  - Added timeout control for internal service request.
  - Preserved rule-based fallback when `ai-service` is unreachable or returns empty intro.
- File: `backend/src/config/index.js`
  - Added:
    - `aiServiceUrl`
    - `aiServiceAuthToken`
    - `aiServiceRequestTimeoutMs`

## AI Service Changes

- Added `ai-service` runtime code:
  - `ai-service/src/server.js`
  - `ai-service/src/routeNarrationService.js`
- Added workspace package:
  - `ai-service/package.json`
- Updated Gemini route-introduction prompt so the model responds in English as a Melbourne-based Victorian hiking and outdoor safety expert, giving practical pre-trip guidance while still using only provided route facts.

## Environment Variables

- Main backend:
  - `AI_SERVICE_URL`
  - `AI_SERVICE_AUTH_TOKEN`
  - `AI_SERVICE_REQUEST_TIMEOUT_MS`
- ai-service:
  - `AI_SERVICE_AUTH_TOKEN`
  - `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
  - `GEMINI_API_URL` (optional)
  - `GEMINI_ROUTE_NARRATION_MODEL`
  - `GEMINI_ROUTE_NARRATION_TIMEOUT_MS`

## Compatibility

- No frontend API contract changes.
- Existing route `intro` field remains unchanged for UI consumers.
