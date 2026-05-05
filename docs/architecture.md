# Architecture

## System Overview

```
Browser (Vue 3 SPA)
    │
    ├── Leaflet (2D maps: Route Planner, Risk Map, Home, Community Reports)
    ├── Mapbox GL JS (3D terrain: Route Detail)
    │
    ▼ HTTP/JSON
Express API Server (/api)
    │
    ├── POST /routes/plan          # Plan safe route
    ├── GET  /routes/history       # Route plan history
    ├── GET  /hazards/realtime     # Live hazard feed
    ├── GET  /locations/search     # Geocoding
    ├── POST /community-reports    # User hazard reports
    ├── POST /auth/*               # Authentication
    └── GET  /knowledge/articles   # Educational content
    │
    ▼
External Services
    ├── OpenRouteService     # Route geometry & directions
    ├── OpenTopoData         # Elevation profiles (primary)
    ├── Open-Meteo           # Elevation profiles (fallback)
    ├── Overpass API (OSM)   # Terrain constraints
    ├── VicEmergency         # Official hazard feed
    ├── OpenWeather          # Weather & temperature
    └── AI Narration Service # Route introduction text
    │
    ▼
PostgreSQL
    ├── hazard_latest_snapshot    # Current hazard state
    ├── hazard_snapshot_history   # Hazard audit trail
    ├── route_geography_profiles  # Elevation/terrain cache
    ├── route_plan_history        # User plan history
    ├── users                     # Auth & profiles
    └── community_reports         # User-submitted hazards
```

## Route Planning Pipeline

1. **Coordinate Validation** — Lat/lng range check, distance bounds (100 m min, 80 km max)
2. **Candidate Generation** — OpenRouteService directions with 3 alternatives. If fewer than 3 candidates, detour waypoints are generated perpendicular to the direct A→B line
3. **Hazard Loading** — Merges VicEmergency (official), OpenWeather (weather), manual entries, and community reports
4. **Geography Enrichment** (per candidate) — Elevation from OpenTopoData → Open-Meteo fallback, terrain constraints from Overpass API (OSM tags for surface, cliffs, waterways, closures). Results cached in Postgres by geometry hash
5. **Duration Re-estimation** — Tobler's hiking function + Naismith's rule + Langmuir's descent correction, adjusted for surface type, trail condition, and user experience level
6. **Risk Scoring** — Three-layer model (see [risk-scoring.md](./risk-scoring.md))
7. **Route Selection** — Recommended route picked by composite score (risk + burden penalty). Three difficulty-slot options (Easy/Moderate/Hard) picked by risk order
8. **AI Narration** — Route introduction text from external AI service, with rule-based fallback

## Hazard Data Flow

```
VicEmergency RSS/JSON ─┐
OpenWeather (8 points)  ├── hazardAggregator (every 2h) ──► PostgreSQL ──► API ──► Frontend
DataVic Roads ──────────┘
Manual entries ─────────┐
Community reports ──────┤── merged at query time
```

Hazards are deduplicated by id + type + coordinates. Each hazard has: type (fire/flood/storm/heat/trail/other), severity (low/moderate/high/extreme), coordinates, source, and recency timestamp.

## Frontend State Management

- **Auth** — Reactive store with localStorage persistence via `authStore.js`
- **Route Plan** — sessionStorage bridge between RoutePlanner and RouteDetail via `routePlanStore.js`
- **Plan Session** — Anonymous users tracked via `X-Plan-Session-Id` header (UUID in localStorage)
- **Hazards** — Fetched per-map with 60-second auto-refresh, scoped to visible bounding box

## Map Strategy

| View | Library | Base Map | Purpose |
|------|---------|----------|---------|
| Route Planner | Leaflet | 3 switchable styles (Voyager/Positron/OpenTopoMap) | Route selection, hazard overlay |
| Route Detail | Mapbox GL JS | Outdoors v12 with 3D terrain | Detailed route inspection |
| Risk Map | Leaflet | OpenTopoMap | Statewide hazard browsing |
| Home Preview | Leaflet | Positron | Embedded risk preview |
| Community Reports | Leaflet | OpenTopoMap | Report placement |

All Leaflet maps are constrained to Victoria's bounding box and share the same hazard zone rendering (concentric circles at 1km / 3km / 5km with severity-dependent opacity).
