# AI Service

Dedicated AI backend service for route introduction generation.

## Endpoints

- `GET /health`

  ```json
  { "ok": true, "service": "ai-service" }
  ```

- `POST /v1/route-introduction`
  - body: `{ "route": { ...routePayload } }`
  - response: `{ "intro": "..." }`

## Security

- In production, `AI_SERVICE_AUTH_TOKEN` is required at startup. Requests must include header:
  - `x-ai-service-token: <AI_SERVICE_AUTH_TOKEN>`
- Deploy this service privately on Railway and only allow trusted callers (your main backend).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` / `AI_SERVICE_PORT` | `8090` | Listen port |
| `AI_SERVICE_AUTH_TOKEN` | — | Shared secret for caller authentication (required in production) |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | — | Gemini API key (required for AI narration) |
| `GEMINI_API_URL` | Google Generative Language v1beta | API base URL |
| `GEMINI_ROUTE_NARRATION_MODEL` | `gemini-2.5-flash-lite` | Model name |
| `GEMINI_ROUTE_NARRATION_TIMEOUT_MS` | `4500` | Request timeout (ms) |

## Quick Start

```bash
npm install
cp .env.example .env   # set GEMINI_API_KEY and AI_SERVICE_AUTH_TOKEN
npm run dev             # → http://localhost:8090
```

## Fallback Behavior

If the Gemini API call fails or times out, the service falls back to a
rule-based introduction generated from route statistics (distance, duration,
terrain type, and difficulty).
