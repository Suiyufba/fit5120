# HikeShield Shared Types

TypeScript type definitions shared across the monorepo. **Types only** — no
runtime code is emitted.

## Usage

### In the backend (Node.js with `--checkJs`)

Add a JSDoc type import in any `.js` file:

```js
/** @type {import('hikeshield-shared').RoutePayload} */
const payload = toRoutePayload(route);
```

Or use inline type casts:

```js
/**
 * @param {import('hikeshield-shared').PlanRouteRequest} req
 * @returns {Promise<import('hikeshield-shared').PlanRouteResponse>}
 */
export async function planSaferRoute(req) { ... }
```

### In the frontend (Vite)

Vite resolves TypeScript `.d.ts` files natively. Import types directly
in `<script setup lang="ts">` or `.ts` service files:

```ts
import type { PlanRouteResponse, RoutePayload } from 'hikeshield-shared';

export async function planSafeRoute(
  params: PlanRouteRequest,
): Promise<PlanRouteResponse> { ... }
```

### Standalone type-check

```bash
npm --workspace shared run typecheck
```

## Build

```bash
npm --workspace shared run build    # emits dist/*.d.ts and dist/*.js
```

Run this before type-checking the frontend or backend, as they import from the
built output.

## Module Map

| Module | Exports |
|--------|---------|
| `hazard.ts` | `Hazard`, `HazardSeverity`, `HazardType`, `HazardSourceStatus`, `HazardMeta`, `HazardSnapshot`, `HazardApiResponse` |
| `route.ts` | `Coordinate`, `RouteGeometry`, `GeographyProfile`, `KeyRisk`, `ZoneSummary`, `NoGoReasons`, `ScoringBreakdown`, `UserLevel`, `Difficulty`, `RiskLevel`, `SafetyStatus`, `GoNoGo`, `RouteCandidate`, `RoutePayload`, `RouteOption` |
| `api.ts` | `ApiError`, `PlanRouteRequest`, `PlanRouteResponse`, `RoutePlanHistoryItem`, `RoutePlanHistoryResponse`, `DeleteRoutePlanHistoryResponse`, `ClearRoutePlanHistoryResponse`, `HazardQueryParams` |
| `auth.ts` | `User`, `RegisterRequest`, `LoginRequest`, `PasswordResetRequest`, `UpdateProfileRequest`, `UpdateSensitiveProfileRequest`, `AuthResponse`, `MeResponse` |
