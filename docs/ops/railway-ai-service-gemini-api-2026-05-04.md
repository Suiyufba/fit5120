# Railway AI Service Gemini API (2026-05-04)

## Summary

- Added Google Gemini configuration to the Railway `ai-service` production environment.
- The existing `ai-service` route-introduction generator already reads `GEMINI_API_KEY` and falls back to rule-based copy when the key is unavailable or the provider request fails.
- No application code change was required.

## Railway Service

- Project: `innovative-imagination`
- Environment: `production`
- Service: `ai-service`
- Public domain: `https://ai-service-production-6001.up.railway.app`

## Variables

Set on the Railway `ai-service` production environment:

```env
GEMINI_API_KEY=<Google Gemini API key stored in Railway>
GEMINI_ROUTE_NARRATION_MODEL=gemini-2.5-flash
```

Do not commit the real Gemini API key to the repository. Keep the secret only in Railway environment variables.

## Runtime Behavior

- Endpoint using Gemini: `POST /v1/route-introduction`
- If `AI_SERVICE_AUTH_TOKEN` is configured, callers must include `x-ai-service-token`.
- The service uses `gemini-2.5-flash` for the route-introduction prompt.
- The service keeps the existing rule-based fallback for missing keys, empty Gemini responses, request failures, and timeouts.

## Verification

After setting variables:

```bash
railway service status --service ai-service --environment production
curl https://ai-service-production-6001.up.railway.app/health
```

For an authenticated route-introduction smoke test, send `POST /v1/route-introduction` with the Railway `AI_SERVICE_AUTH_TOKEN` header.
