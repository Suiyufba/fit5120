# HikeShield

FIT5120 monorepo — Victorian hiking safety platform. Plan safer routes with live hazard
data, terrain-aware risk scoring, and community intelligence.

## Features

- **Risk Map** — Statewide live hazard overlay (fire, flood, storm, heat, trail) from
  VicEmergency, OpenWeather, and DataVic Roads
- **Route Planner** — Safe-route planning with OpenRouteService geometry, elevation
  profiles, and a three-layer risk scoring model
- **Route Detail** — 3D terrain inspection (Mapbox GL JS), risk breakdown, AI-generated
  route introduction, and suggested preparation
- **Community Reports** — User-submitted hazard sightings with photo upload and 24-hour TTL
- **Knowledge Hub** — Curated hiking safety articles from the database
- **Authentication** — Register / login / password reset with JWT and per-level risk
  thresholds

## Architecture

```
Browser (Vue 3 SPA)
    │
    ├── Leaflet (2D maps: Route Planner, Risk Map, Home, Community Reports)
    ├── Mapbox GL JS (3D terrain: Route Detail)
    │
    ▼ HTTP/JSON
Express API Server (/api)
    │
    ├── POST   /routes/plan              # Plan safe route
    ├── GET    /routes/history           # Route plan history
    ├── DELETE /routes/history           # Clear route history
    ├── DELETE /routes/history/:id       # Delete one history item
    ├── GET    /hazards/realtime         # Live hazard feed
    ├── GET    /hazards/history          # Hazard snapshots over time
    ├── GET    /locations/search         # Geocoding (forward)
    ├── GET    /locations/reverse        # Geocoding (reverse)
    ├── GET    /community-reports        # List community reports
    ├── POST   /community-reports        # Submit a community report
    ├── POST   /community-reports/images # Upload report image
    ├── GET    /community-reports/images/:id  # Get report image
    ├── POST   /auth/register            # Create account
    ├── POST   /auth/login               # Sign in
    ├── POST   /auth/logout              # Clear auth cookie
    ├── GET    /auth/me                  # Current user info
    ├── PUT    /auth/profile             # Update profile
    ├── PUT    /auth/profile/sensitive   # Update credentials
    ├── POST   /auth/password-reset/security  # Reset password via security Q&A
    └── GET    /knowledge/articles       # Educational content
    │
    ▼
External Services
    ├── OpenRouteService     # Route geometry & directions
    ├── OpenTopoData         # Elevation profiles (primary)
    ├── Open-Meteo           # Elevation fallback
    ├── Overpass API (OSM)   # Terrain constraints
    ├── VicEmergency         # Official hazard feed
    ├── OpenWeather          # Weather & temperature
    └── AI Narration Service # Gemini-powered route introductions
    │
    ▼
PostgreSQL / Memory
    ├── hazard_latest_snapshot
    ├── hazard_snapshot_history
    ├── route_geography_profiles
    ├── route_plan_history
    ├── users
    ├── community_reports
    ├── community_report_images
    ├── manual_hazards
    └── knowledge_articles
```

## Repository Structure

```text
hikeshield/
├── frontend/          # Vue 3 SPA (Vercel)
├── backend/           # Express API server (Railway)
├── ai-service/        # AI route narration (Railway)
├── shared/            # TypeScript type definitions
├── docs/              # Architecture & risk model docs
└── .env.example       # Shared environment variables
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API), Vue Router, Vite, Tailwind CSS |
| Maps | Leaflet, Mapbox GL JS |
| Backend | Node.js, Express, Helmet |
| Database | PostgreSQL (pg), Redis (ioredis) |
| Auth | HttpOnly cookie session with JWT (jsonwebtoken), bcryptjs, express-rate-limit |
| AI | Gemini 2.5 Flash (generative language API) |
| Deploy | Vercel (frontend), Railway (backend + AI) |

## Testing & CI

```bash
# Run all 61 tests (47 unit + 14 API integration)
npm --workspace backend run test

# Type-check both workspaces
npm --workspace backend run typecheck
npm --workspace frontend run typecheck
```

GitHub Actions CI runs on every push: shared build → backend typecheck → test → frontend typecheck → build.

See [`docs/testing.md`](docs/testing.md) for the full testing guide.

## Quick Start

```bash
# Install all workspaces
npm install

# Build shared types (required before type-checking)
npm --workspace shared run build

# Start frontend dev server (http://localhost:5173)
npm run dev:frontend

# Start backend dev server (http://localhost:8080)
npm --workspace backend run dev

# Start AI service (http://localhost:8090)
npm run dev:ai-service
```

Copy `.env.example` to each service directory and fill in the required keys
before starting.

## Services

- **Frontend**: Vue 3 SPA with map-based route planning and risk visualization —
  see `frontend/README.md`
- **Backend**: Express API for hazards, routes, auth, community reports,
  knowledge articles, and geocoding — see `backend/README.md`
- **AI Service**: Gemini-powered route introduction with rule-based fallback —
  see `ai-service/README.md`
- **Shared**: TypeScript type definitions shared across the monorepo —
  see `shared/README.md`
- **Worker**: Reserved for async jobs (not yet implemented)

## Documentation

- [`docs/deployment.md`](docs/deployment.md) — Vercel + Railway deployment guide
- [`docs/api.md`](docs/api.md) — Full API reference with request/response schemas
- [`docs/testing.md`](docs/testing.md) — Test structure, running tests, writing new ones
- [`docs/architecture.md`](docs/architecture.md) — Architecture decisions and diagrams
- [`docs/risk-scoring.md`](docs/risk-scoring.md) — Three-layer risk scoring model
- [`docs/known-limitations.md`](docs/known-limitations.md) — Important safety disclaimers
