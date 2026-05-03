# Railway AI Service Gemini Model Update (2026-05-04)

## Summary

- Updated Railway `ai-service` production model selection from `gemini-2.5-flash-lite` to `gemini-2.5-flash`.
- Kept the same `GEMINI_API_KEY`; only `GEMINI_ROUTE_NARRATION_MODEL` changed.
- No frontend API change was required.

## Railway Variable

```env
GEMINI_ROUTE_NARRATION_MODEL=gemini-2.5-flash
```

## Reason

`gemini-2.5-flash` provides stronger response quality than Flash-Lite while remaining available on the Gemini API free tier. This should improve the wording and reasoning quality of route-planning AI assistant reminders.

## Verification

After updating the Railway variable, verify:

```bash
railway service status --service ai-service --environment production
curl https://ai-service-production-6001.up.railway.app/health
```

Then run an authenticated `POST /v1/route-introduction` smoke test using the Railway `AI_SERVICE_AUTH_TOKEN`.
