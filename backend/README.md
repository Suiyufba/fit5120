# HikeShield Backend (Railway-ready)

The backend exposes the minimal set of APIs the frontend needs:

- `GET /api/hazards/realtime?bbox=west,south,east,north&layers=fire,flood,storm,heat`
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset/security`
- `GET /api/auth/me`
- `POST /api/routes/plan` (JWT required)

## Module Layout

```text
src/
├── config/                      # Environment variables & global config
├── controllers/                 # HTTP controllers
├── routes/                      # API route registration
├── modules/
│   └── hazards/
│       ├── adapters/            # Upstream data-source adapters
│       ├── data/                # Fallback data
│       ├── domain/              # Hazard domain utilities
│       └── services/            # Aggregation / cache scheduling
│   └── routes/
│       ├── adapters/            # OpenRouteService adapter
│       ├── domain/              # Risk scoring, route timing
│       ├── services/            # Route planning, geography, narration
│       └── repositories/        # Route plan history (Postgres)
├── infrastructure/
│   ├── cache/                   # Cache (memory / Redis)
│   └── db/                      # Postgres clients & repositories
├── shared/
│   └── http/                    # Shared HTTP utilities
└── server.js                    # Application entry point
```

## 1) Local Start

```bash
npm install
cp .env.example .env
npm run dev
```

Default address: `http://localhost:8080/api/hazards/realtime`

## 2) Response Shape (aligned with frontend)

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

## 3) Caching & Polling Strategy

- Fetch interval: `FETCH_INTERVAL_MS` (default 2 hours)
- API returns cached snapshots — does not hit upstream on every request
- When `DATABASE_URL` is configured, snapshots persist to Postgres (latest only, no history)
- Default cache is in-memory; set `REDIS_URL` to switch to Redis (recommended for multi-instance Railway deployments)
- Upstream failures return an empty list with `lastError` set — never fall back to sample data

## 4) Railway Deployment

### 4.1 Create Service

1. Railway → `New Project` → `Deploy from GitHub Repo`
2. Select the `hiking_backEnd` repository
3. Railway auto-detects the Node project and runs:
   - Build: `npm install`
   - Start: `npm start`

### 4.2 Railway Environment Variables

Required minimum:

- `PORT=8080` (Railway injects this automatically — keep it)
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
- `OPENROUTESERVICE_SNAP_RADIUS_M=1000` (snap start/end to nearest routable path)
- `HIKING_BASE_SPEED_KMH=4.5`
- `OPENTOPO_DATA_API_URL=https://api.opentopodata.org/`
- `OPENTOPO_DATA_DATASET=aster30m`
- `OVERPASS_API_URL=https://overpass-api.de/api/interpreter`
- `VIC_EMERGENCY_FEED_URL=...` (confirmed VicEmergency feed URL)
- `VIC_EMERGENCY_API_KEY=...` (if the feed requires authentication)
- `REDIS_URL=...` (if using Railway Redis plugin)
- `REDIS_TTL_SECONDS=90`

### 4.3 Public URL

After deployment you'll get:
`https://<railway-domain>/api/hazards/realtime`

## 5) Frontend Configuration

Frontend `.env`:

```env
VITE_HAZARD_API_BASE_URL=https://<railway-domain>/api
```

The frontend automatically requests:
- `/hazards/realtime`
- Supports query params: `bbox` and `layers`
- 60-second polling (implemented in the frontend)

## 6) Current API Capabilities

- Aggregation endpoint: `GET /api/hazards/realtime`
- Query parameters:
  - `bbox=west,south,east,north`
  - `layers=fire,flood,storm,heat`
- Data source adapters:
  - DataVic (default URL provided)
  - BoM (configurable entry point)
  - VicEmergency (configurable entry point)

## 7) Planned Enhancements

- SSE / WebSocket push for real-time hazard updates
- GeoJSON native response mode
- Upstream health checks and alerts (e.g. `/api/health/providers`)

## 8) Authentication Endpoints

`POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "age": 24,
  "region": "Melbourne, VIC",
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

`POST /api/auth/password-reset/security`

```json
{
  "email": "user@example.com",
  "securityQuestion": "What is your favorite outdoor activity?",
  "securityAnswer": "hiking",
  "newPassword": "newPassword123"
}
```

## 9) Route Planning (per-level risk control)

`POST /api/routes/plan`

Header: `Authorization: Bearer <token>`

```json
{
  "start": { "lat": -37.8136, "lng": 144.9631 },
  "end": { "lat": -38.687, "lng": 143.391 }
}
```

Returns:
- `recommendedRoute` — includes `geometry / distanceKm / durationMin / difficulty / riskScore / riskLevel / goNoGo / explanation / keyRisks`
- `alternatives` — alternative route summaries
- `recommendedRoute.geographyProfile` — includes `totalAscentM / totalDescentM / maxSlopePct / terrainType / surfaceType / trailCondition / riverCrossingCount / cliffExposureCount / closureCount`
- `scoringBreakdown` — `hazardScore / weatherScore / zoneExposureScore / difficultyScore / geographyScore / feasibilityScore / weightedTotal`

Notes:
- Route geometry is generated by OpenRouteService Directions API, default profile `foot-hiking`
- `durationMin` uses hiking-semantic estimation (Tobler's function + Naismith's rule), no longer reuses driving time
- Risk inputs now merge official hazards, manual hazards, and community reports
- Geography profiles are cached in PostgreSQL by route geometry hash to avoid redundant elevation/OSM queries
- Total risk score considers:
  - hazard proximity (how close hazards are to the route)
  - weather overlap (weather-type risks)
  - zone exposure (L1/L2/L3 risk zone coverage)
  - route burden (distance, hiking duration, detour cost)
  - geography profile (elevation, cumulative ascent/descent, slope, surface & trail constraints)
- Extra-long hiking routes trigger an additional `No-Go` flag to prevent unreasonably low risk scores for very long distances
