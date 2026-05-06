# HikeShield Shared Types

TypeScript type definitions shared across the monorepo. **Types only** — no
runtime code is emitted.

## Usage

### In the backend (TypeScript)

Import shared types directly in any `.ts` file:

```ts
import type { RoutePayload } from 'hikeshield-shared';

const payload = toRoutePayload(route);
```

Or annotate function contracts directly:

```ts
import type { PlanRouteRequest, PlanRouteResponse } from 'hikeshield-shared';

export async function planSaferRoute(req: PlanRouteRequest): Promise<PlanRouteResponse> { ... }
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
