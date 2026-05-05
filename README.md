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
    ├── OpenTopoData         # Elevation profiles
    ├── Open-Meteo           # Elevation fallback
    ├── Overpass API (OSM)   # Terrain constraints
    ├── VicEmergency         # Official hazard feed
    ├── OpenWeather          # Weather & temperature
    └── AI Narration Service # Gemini-powered route introductions
    │
    ▼
PostgreSQL / Memory
    ├── hazard_latest_snapshot
    ├── route_geography_profiles
    ├── route_plan_history
    ├── users
    ├── community_reports
    └── knowledge_articles
```

## Repository Structure

```text
hikeshield/
├── frontend/          # Vue 3 SPA (Vercel)
├── backend/           # Express API server (Railway)
├── ai-service/        # AI route narration (Railway)
├── worker/            # Async jobs (placeholder)
├── shared/            # Shared types/helpers (placeholder)
├── docs/              # Architecture & risk model docs
├── .env.example
├── package.json       # Monorepo workspace scripts
└── DESIGN.md          # Design system reference
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vue Router, Vite, Tailwind CSS |
| Maps | Leaflet, Mapbox GL JS |
| Backend | Node.js, Express, Helmet |
| Database | PostgreSQL (pg), Redis (ioredis) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| AI | Gemini 2.5 Flash (generative language API) |
| Deploy | Vercel (frontend), Railway (backend + AI) |

## Quick Start

```bash
# Install all workspaces
npm install

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
- **Backend**: Express API for hazards, routes, auth, community reports, and
  knowledge articles — see `backend/README.md`
- **AI Service**: Gemini-powered route introduction with rule-based fallback —
  see `ai-service/README.md`
- **Worker**: Reserved for async jobs (not yet implemented)
- **Shared**: Reserved for cross-package types and helpers (not yet implemented)
