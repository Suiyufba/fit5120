# Route Risk: Align No-Go With Risk Score (2026-04-18)

## Goal
- Fix inconsistent route output where `goNoGo` was `Dangerous` / `No-Go` but `riskLevel` still displayed `Low`.

## Root Cause
- `goNoGo` and `riskScore` used separate logic paths.
- Hard-stop conditions such as excessive route duration, distance caps, closures, and steep terrain could mark a route as `No-Go` without lifting the final numeric risk score enough to leave the `Low` bucket.

## Changes
- Updated `backend/src/modules/routes/domain/routeRisk.js`.
- `goNoGoDecision()` now returns both:
  - final `goNoGo`
  - structured `noGoReasons`
- Added `noGoFloorScoreByReason()` so `No-Go` routes receive a minimum aligned risk score:
  - `85` for extreme-close hazard or route closure
  - `72` for severe cliff exposure or steep terrain mismatch
  - `65` for excessive route distance/duration or score-threshold-triggered `No-Go`
- Final displayed `riskScore` / `riskLevel` now use the adjusted score after the `No-Go` floor is applied.

## Tests
- Updated `backend/src/modules/routes/domain/routeRisk.test.js`.
- Added coverage to ensure `No-Go` routes cannot remain in the `Low` risk bucket.

## Impact
- Users no longer see contradictory combinations like `Dangerous` plus `Low`.
- Risk labels now better reflect hard route rejection conditions.
