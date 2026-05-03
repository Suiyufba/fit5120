# Route Safety Status And Gemini Context (2026-05-04)

## Summary

- Added a route-level `safetyStatus` field with user-facing values:
  - `Safe`
  - `Dangerous`
- Kept the existing backend `goNoGo` field for compatibility with route sorting, tests, and saved history.
- Expanded the route introduction payload sent from backend to `ai-service`, and from `ai-service` to Gemini, so generated reminders have more safety context.

## API Payload

Route payloads now include:

```json
{
  "goNoGo": "Go",
  "safetyStatus": "Safe",
  "noGoReasons": {},
  "scoringBreakdown": {}
}
```

For dangerous routes:

```json
{
  "goNoGo": "No-Go",
  "safetyStatus": "Dangerous"
}
```

## Gemini Context

Gemini now receives a compact facts object containing:

- `safetyStatus`
- `riskScore`
- `riskLevel`
- `hikerExperienceLevel`
- distance, duration, and difficulty
- `geographyProfile`
- `zoneSummary`
- `noGoReasons`
- top `keyRisks` with source and zone labels
- top `suggestedPrep` items
- `scoringBreakdown`

The prompt instructs Gemini to mention `Safe` or `Dangerous`, warn clearly when a route is dangerous, and keep using only supplied facts.

## Frontend

- `RoutePlanner` now displays `summary.safetyStatus`.
- `RouteDetail` prefers `safetyStatus` and falls back to legacy `goNoGo`.
- `routeApi` normalizes older route payloads so saved records still display correctly.

## Notes

- No Gemini API key is exposed to the browser.
- No new endpoint was added.
