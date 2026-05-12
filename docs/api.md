# API Reference

Base URL: `https://your-backend.railway.app/api`

## Auth

### POST /auth/register
Register a new user.

| Field | Type | Required | Notes |
|---|---|---|---|
| email | string | yes | |
| password | string | yes | Min 12 chars, upper+lower+digit+special |
| age | number | yes | 10-100 |
| region | string | yes | |
| securityQuestion | string | yes | |
| securityAnswer | string | yes | Min 2 chars |
| assessmentAnswers | object | no | Hiker risk assessment |

Response `201`: `{ user }` and sets an HttpOnly auth cookie.
Errors: `409` email exists, `400` validation

### POST /auth/login
Signs in and sets an HttpOnly auth cookie.

Response `200`: `{ user }`  
Errors: `401`

### POST /auth/logout
Clears the auth cookie.

Response `200`: `{ ok: true }`

### GET /auth/me
Returns current user profile. Requires the auth cookie. Legacy bearer auth is still accepted for API clients.

Response `200`: `{ user }`  
Errors: `401`

### PUT /auth/profile
Update age/region. Requires auth.

Errors: `404` user not found, `400`

### POST /auth/password-reset/security
Reset password with security question.

Response `200`: `{ ok: true }`  
Errors: `400`

---

## Routes

### POST /routes/plan
Plan a safer hiking route.

| Field | Type | Required |
|---|---|---|
| start | { lat, lng } | yes |
| end | { lat, lng } | yes |

Auth cookie: optional — enables personalized risk.
Header: `X-Plan-Session-Id` (optional — ties anonymous history, not used for rate-limit identity)

Response `200`: `{ recommendedRoute, alternatives, routeOptions, userLevel }`  
Errors: `400` invalid points/too far, `404` no user, `503` ORS down

### GET /routes/history
List saved route plans.

| Query | Type | Default |
|---|---|---|
| limit | number | 20 |

Response `200`: `{ history[], fetchedAt }`

### DELETE /routes/history/:id
Delete a single history entry.

### DELETE /routes/history
Clear all history for user/session.

---

## Hazards

### GET /hazards/realtime

| Query | Type | Example |
|---|---|---|
| bbox | string | `144.5,-38.5,145.5,-37.5` |
| layers | string | `fire,flood,storm` |

Response `200`: `{ hazards[], fetchedAt, fromFallback, isStale, meta }`  
Errors: `400` invalid bbox/layers

`isStale: true` means data is older than the freshness threshold.  
`fromFallback: true` means upstream providers failed — showing last known snapshot.

### GET /hazards/history

| Query | Type | Default |
|---|---|---|
| limit | number | 24 |

Response `200`: `{ snapshots[], fetchedAt }`

---

## Community Reports

### GET /community-reports
List recent reports (24h TTL).

| Query | Type | Default |
|---|---|---|
| limit | number | 50 |

Response `200`: `{ reports[], storage, fetchedAt }`

### POST /community-reports
Submit a new report.

| Field | Type | Required |
|---|---|---|
| title | string | yes |
| description | string | yes |
| locationName | string | yes |
| hazardType | string | yes (fire,flood,storm,trail,other) |
| severity | string | yes (low,moderate,high,extreme) |
| latitude | number | yes |
| longitude | number | yes |
| reporterName | string | no (default: Anonymous Hiker) |
| imageUrl | string | no |

Response `201`: `{ report, storage }`  
Errors: `400`

### POST /community-reports/images
Upload a report image (base64 data URL, max 512KB).

Response `201`: `{ id, url, byteSize, storage }`

### GET /community-reports/images/:id
Fetch uploaded image. Returns binary.

---

## Knowledge

### GET /knowledge/articles

| Query | Type |
|---|---|
| topic | string (all, general, hazard safety, weather essentials, getting started) |

Response `200`: `{ articles[] }`  
Errors: `400` invalid topic

---

## Locations

### GET /locations/search

| Query | Type |
|---|---|
| q | string (min 2 chars) |
| limit | number (default 6) |

### GET /locations/reverse

| Query | Type |
|---|---|
| lat | number |
| lng | number |

---

## Health

### GET /health
Response `200`: `{ ok: true, service, time, fetchIntervalMs }`

---

## Error Format

Errors always include a human-readable `error` message. Some newer endpoints also include a machine-readable `code` field:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

Common error codes include: `VALIDATION_ERROR`, `AUTH_UNAUTHORIZED`, `AUTH_EMAIL_EXISTS`, `AUTH_INVALID_CREDENTIALS`, `ROUTE_TOO_FAR`, `ROUTE_SERVICE_DOWN`, `NOT_FOUND`, `INTERNAL_ERROR`, `RATE_LIMITED`.
