# ai-service

Dedicated AI backend service for route introduction generation.

## Endpoints

- `GET /health`
- `POST /v1/route-introduction`
  - body: `{ "route": { ...routePayload } }`
  - response: `{ "intro": "..." }`

## Security

- If `AI_SERVICE_AUTH_TOKEN` is set, requests must include header:
  - `x-ai-service-token: <AI_SERVICE_AUTH_TOKEN>`
- Deploy this service privately on Railway and only allow trusted callers (your main backend).

## Environment Variables

- `PORT` or `AI_SERVICE_PORT` (default `8090`)
- `AI_SERVICE_AUTH_TOKEN` (recommended)
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- `GEMINI_API_URL` (optional, default Google Generative Language v1beta)
- `GEMINI_ROUTE_NARRATION_MODEL` (default `gemini-2.5-flash-lite`)
- `GEMINI_ROUTE_NARRATION_TIMEOUT_MS` (default `4500`)
