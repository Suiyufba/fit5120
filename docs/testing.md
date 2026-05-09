# Testing Guide

## Quick Start

```bash
# Run all tests (backend only)
npm --workspace backend run test

# Run typecheck
npm --workspace backend run typecheck
npm --workspace frontend run typecheck

# Build shared types first (required before typecheck)
npm --workspace shared run build
```

## Test Structure

```
backend/src/
├── modules/
│   ├── communityReports/repositories/
│   │   └── communityReportRepository.test.ts   # TTL, purge, list
│   └── routes/
│       ├── adapters/
│       │   └── openRouteServiceAdapter.test.ts # ORS retry, fallback
│       ├── domain/
│       │   ├── routeRisk.test.ts               # Risk scoring, No-Go logic
│       │   └── routeTiming.test.ts             # Duration estimation
│       └── services/
│           ├── routeNarrationService.test.ts   # AI fallback parsing
│           └── routePlannerService.test.ts     # Route option ordering
├── routes/__tests__/
│   ├── authRoutes.test.ts                      # Auth controller handlers
│   └── apiRoutes.test.ts                       # Input validation, errors
```

## Test Categories

### Unit Tests (47 tests)
Test core algorithms in isolation with mock data.

| Module | Tests | What's covered |
|--------|-------|---------------|
| routeRisk | 15 | Risk scoring, No-Go gates, severity weighting, prep tips |
| routeTiming | 7 | Duration estimation, terrain factors, user pace |
| routePlannerService | 1 | Route option ordering by burden |
| routeNarrationService | 2 | AI fallback formatting |
| openRouteServiceAdapter | 3 | ORS retry logic, profile fallback |
| communityReportRepository | 3 | TTL constant, purge, list filtering |

### API Integration Tests (14 tests)
Test controller handlers with mock Express req/res objects. No database required.

| File | Tests | What's covered |
|------|-------|---------------|
| authRoutes.test.ts | 6 | Register, login, me, password reset, profile update |
| apiRoutes.test.ts | 8 | Health check, bbox/layers validation, topic validation, 404 handling |

## Running Individual Tests

```bash
# Run a specific test file
NODE_ENV=test npx tsx --test backend/src/modules/routes/domain/routeRisk.test.ts

# Run a specific test pattern
NODE_ENV=test npx tsx --test --test-name-pattern="No-Go" backend/src/modules/routes/domain/routeRisk.test.ts
```

## Writing New Tests

Tests use Node.js built-in test runner (`node:test`) and `node:assert/strict`.

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

test('descriptive test name', async () => {
  const result = await someFunction(input);
  assert.equal(result.status, 200);
});

test('synchronous test', () => {
  const value = computeSomething();
  assert.ok(value > 0);
});
```

### Controller Tests

Use the `mockReq`/`mockRes` pattern:

```ts
function mockReq(overrides = {}) {
  return { body: {}, query: {}, params: {}, headers: {}, auth: undefined, ...overrides };
}
function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}

test('endpoint validates input', async () => {
  const req = mockReq({ query: { bbox: 'invalid' } });
  const res = mockRes();
  await getRealtimeHazards(req, res);
  assert.equal(res.statusCode, 400);
});
```

## CI Pipeline

GitHub Actions runs on every push to `main`:

```yaml
- npm ci
- npm --workspace shared run build
- npm --workspace backend run typecheck
- npm --workspace backend run test
- npm --workspace frontend run typecheck
- npm --workspace frontend run build
```

## Known Gaps

- No frontend component tests (Vitest not yet configured)
- No E2E tests (Playwright not yet set up)
- Auth tests need a database for full end-to-end flow
- Route planning tests mock ORS — no live API integration tests
