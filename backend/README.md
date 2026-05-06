# HikeShield Backend (Railway-ready)

Express API server providing hazard aggregation, route planning, authentication,
community reports, knowledge articles, and geocoding.

## API Endpoints

### Health
- `GET /api/health`

### Hazards
- `GET /api/hazards/realtime?bbox=west,south,east,north&layers=fire,flood,storm,heat`
- `GET /api/hazards/history`

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (JWT required)
- `PUT /api/auth/profile` (JWT required)
- `PUT /api/auth/profile/sensitive` (JWT required)
- `POST /api/auth/password-reset/security`

### Route Planning
- `POST /api/routes/plan` (optional JWT — anonymous users tracked via `X-Plan-Session-Id`)
- `GET /api/routes/history` (optional JWT)
- `DELETE /api/routes/history` (optional JWT)
- `DELETE /api/routes/history/:id` (optional JWT)

### Knowledge
- `GET /api/knowledge/articles`

### Community Reports
- `GET /api/community-reports`
- `POST /api/community-reports`
- `POST /api/community-reports/images`
- `GET /api/community-reports/images/:id`

### Locations
- `GET /api/locations/search?q=...`
- `GET /api/locations/reverse?lat=...&lng=...`

## Module Layout

```text
src/
├── config/                      # Environment variables & global config
├── controllers/                 # HTTP controllers
├── routes/                      # API route registration
├── modules/
│   ├── hazards/
│   │   ├── adapters/            # VicEmergency, BoM, DataVic adapters
│   │   ├── data/                # Fallback data
│   │   ├── domain/              # Hazard deduplication & filtering
│   │   ├── repositories/        # Manual hazard persistence
│   │   └── services/            # Aggregation & cache scheduling
│   ├── routes/
│   │   ├── adapters/            # OpenRouteService adapter
│   │   ├── domain/              # Risk scoring, route timing
│   │   ├── repositories/        # Geography cache & plan history
│   │   └── services/            # Route planning, geography, narration
│   ├── auth/
│   │   ├── domain/              # User assessment logic
│   │   ├── middlewares/         # requireAuth, optionalAuth
│   │   ├── repositories/        # User persistence
│   │   └── services/            # Auth service (register, login, password reset)
│   ├── communityReports/
│   │   └── repositories/        # Report & image persistence
│   ├── knowledge/
│   │   └── repositories/        # Article persistence
│   └── locations/
│       └── services/            # Geocoding (Nominatim + Photon)
├── infrastructure/
│   ├── cache/                   # In-memory / Redis cache
│   └── db/                      # Postgres client & repositories
├── shared/
│   └── http/                    # Shared HTTP fetch utilities
└── server.js                    # Application entry point
```

## Local Start

```bash
npm install
cp .env.example .env
npm run dev
```

Default address: `http://localhost:8080/api/health`

## Hazard Response Shape

```json
{
  "hazards": [
    {
      "id": "evt-123",
      "type": "fire",
      "severity": "high",
      "title": "Smoke near Apollo Bay",
      "description": "...",
      "source": "VicEmergency",
      "sourceUrl": "https://...",
      "updatedAt": "2026-03-27T12:00:00Z",
      "coordinates": [-38.75, 143.66]
    }
  ],
  "fetchedAt": "2026-03-27T12:00:00Z",
  "fromFallback": false,
  "meta": {
    "count": 1,
    "totalBeforeFilter": 10,
    "sourceStatus": [
      { "name": "DataVic Road Disruptions", "ok": true, "count": 4, "error": null }
    ],
    "lastError": null
  }
}
```

`severity` enum: `extreme | high | moderate | low`

## Caching & Polling Strategy

- Fetch interval: `FETCH_INTERVAL_MS` (default 2 hours)
- API returns cached snapshots — does not hit upstream on every request
- When `DATABASE_URL` is configured, snapshots persist to Postgres (hazard snapshots, route geography profiles, community reports, manual hazards, knowledge articles)
- Default cache is in-memory; set `REDIS_URL` to switch to Redis (recommended for multi-instance Railway deployments)
- Upstream failures return an empty list with `lastError` set — fallback data is no longer served

## Authentication Endpoints

`POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "age": 24,
  "region": "Melbourne, VIC",
  "securityQuestion": "What is your favorite outdoor activity?",
  "securityAnswer": "hiking",
  "assessmentAnswers": {
    "q_weather": "b",
    "q_injury": "a",
    "q_lost": "a",
    "q_fire": "b"
  }
}
```

`POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

`GET /api/auth/me`

Header: `Authorization: Bearer <token>`

`PUT /api/auth/profile` (JWT required)

```json
{
  "age": 25,
  "region": "Geelong, VIC"
}
```

`PUT /api/auth/profile/sensitive` (JWT required)

```json
{
  "email": "newemail@example.com",
  "newPassword": "newPassword123",
  "securityQuestion": "What is your pet's name?",
  "securityAnswer": "buddy"
}
```

`POST /api/auth/password-reset/security`

```json
{
  "email": "user@example.com",
  "securityQuestion": "What is your favorite outdoor activity?",
  "securityAnswer": "hiking",
  "newPassword": "newPassword123"
}
```

## Route Planning

`POST /api/routes/plan`

Header (optional): `Authorization: Bearer <token>`

```json
{
  "start": { "lat": -37.8136, "lng": 144.9631 },
  "end": { "lat": -38.687, "lng": 143.391 }
}
```

Returns:
- `recommendedRoute` — includes `geometry / distanceKm / durationMin / difficulty / riskScore / riskLevel / goNoGo / explanation / keyRisks`
- `alternatives` — alternative route summaries (up to 3 difficulty slots: Easy/Moderate/Hard)
- `recommendedRoute.geographyProfile` — includes `totalAscentM / totalDescentM / maxSlopePct / terrainType / surfaceType / trailCondition / riverCrossingCount / cliffExposureCount / closureCount`
- `scoringBreakdown` — full three-layer risk scoring detail (see `docs/risk-scoring.md`)

Notes:
- Route geometry is generated by OpenRouteService Directions API, default profile `foot-hiking`
- `durationMin` uses hiking-semantic estimation (Tobler's function + Naismith's rule), not driving time
- Risk inputs merge official hazards, manual hazards, and community reports
- Geography profiles are cached in PostgreSQL by route geometry hash
- Anonymous users tracked via `X-Plan-Session-Id` header (UUID stored in sessionStorage)
- Three-layer risk scoring: base risk × environmental multiplier + interaction penalty, adjusted by user profile factor
- Extra-long hiking routes trigger a No-Go flag to prevent unreasonably low risk scores

## Community Reports

`POST /api/community-reports`

```json
{
  "hazardType": "trail",
  "severity": "moderate",
  "title": "Fallen tree on trail",
  "description": "Large tree blocking the path near the 3km mark",
  "coordinates": { "lat": -37.8136, "lng": 145.1234 }
}
```

`POST /api/community-reports/images`

Multipart form upload with `image` file and `reportId` field.

Reports auto-expire after 24 hours. A background purge runs on startup and every hour.

## Knowledge Articles

`GET /api/knowledge/articles`

Returns curated hiking safety articles stored in the database.

## Location Services

`GET /api/locations/search?q=melbourne`

Forward geocoding via Nominatim and Photon, constrained to Victoria.

`GET /api/locations/reverse?lat=-37.8136&lng=144.9631`

Reverse geocoding — returns address/place name for coordinates.

## Railway Deployment

### Create Service

1. Railway → `New Project` → `Deploy from GitHub Repo`
2. Select the `hiking_backEnd` repository
3. Railway auto-detects the Node project and runs:
   - Build: `npm install`
   - Start: `npm start`

### Railway Environment Variables

Required minimum:

- `PORT=8080` (Railway injects this automatically)
- `CORS_ORIGIN=https://<your-frontend-domain>`
- `FETCH_INTERVAL_MS=7200000`
- `REQUEST_TIMEOUT_MS=10000`
- `STALE_THRESHOLD_MS=600000`
- `DEFAULT_LAYERS=fire,flood,storm,heat`
- `DATABASE_URL=<Railway Postgres URL>`
- `DATABASE_SSL=true`
- `AUTH_JWT_SECRET=<strong-random-secret>`
- `AUTH_JWT_EXPIRES_IN=7d`

Optional (recommended for production):

- `VICROADS_API_URL=...` (DataVic Unplanned Disruption API)
- `VICROADS_API_KEY=...` (from Transport Victoria Open Data Portal)
- `OPENWEATHER_API_KEY=...` (OpenWeather API Key)
- `OPENWEATHER_API_URL=https://api.openweathermap.org/data/2.5/weather`
- `OPENROUTESERVICE_API_BASE_URL=https://api.openrouteservice.org`
- `OPENROUTESERVICE_API_KEY=...` (OpenRouteService API Key — required for route planning)
- `OPENROUTESERVICE_PROFILE=foot-hiking`
- `OPENROUTESERVICE_SNAP_RADIUS_M=1000`
- `HIKING_BASE_SPEED_KMH=4.5`
- `OPENTOPO_DATA_API_URL=https://api.opentopodata.org/`
- `OPENTOPO_DATA_DATASET=aster30m`
- `OVERPASS_API_URL=https://overpass-api.de/api/interpreter`
- `VIC_EMERGENCY_FEED_URL=...` (confirmed VicEmergency feed URL)
- `VIC_EMERGENCY_API_KEY=...` (if the feed requires authentication)
- `REDIS_URL=...` (if using Railway Redis plugin)
- `REDIS_TTL_SECONDS=90`
- `AI_SERVICE_URL=http://localhost:8090`
- `AI_SERVICE_AUTH_TOKEN=...`
- `AI_SERVICE_REQUEST_TIMEOUT_MS=5000`

### Public URL

After deployment:
`https://<railway-domain>/api/hazards/realtime`

## Frontend Configuration

Frontend `.env`:

```env
VITE_HAZARD_API_BASE_URL=https://<railway-domain>/api
```

The frontend polls `/hazards/realtime` every 60 seconds, scoped to visible map bounds.
