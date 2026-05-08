# HikeShield Documentation

Architecture and design documentation for the HikeShield hiking safety platform.

## Docs

- **[architecture.md](./architecture.md)** — System overview, data flow, route planning pipeline, hazard aggregation, frontend state management, and map strategy
- **[risk-scoring.md](./risk-scoring.md)** — Three-layer risk scoring model: base risk, environmental multiplier, interaction penalties, Go/No-Go rules, and user profile factor

## Key Features

- **Plan Safe Route** — Pick two points on a map, get multiple route candidates ranked by safety. Each route is scored against live hazards (fire, flood, storm, heat) and terrain conditions.
- **Mobile Route Planner** — On phones and tablets, route search, point reset, planning, history, and route summary controls are available from a bottom sheet over the Leaflet map.
- **Risk Map** — Interactive map showing active hazards across Victoria with severity zones.
- **Community Reports** — Crowd-sourced hazard reports with photo upload and 24-hour TTL.
- **Knowledge Hub** — Educational articles on hiking safety.
- **User Profiles** — Experience-level assessment that personalizes risk thresholds and preparation advice.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API), Leaflet (2D maps), Mapbox GL JS (3D terrain), Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| External APIs | OpenRouteService (directions), OpenTopoData + Open-Meteo (elevation), Overpass API (OSM terrain), VicEmergency (hazards), OpenWeather (weather) |
| AI Service | Gemini-powered route narration (ai-service) |
| Hosting | Railway (backend + AI), Vercel (frontend) |

## Project Structure

```
├── frontend/          # Vue 3 SPA
│   └── src/
│       ├── views/     # RoutePlanner, RouteDetail, RiskMap, Home, etc.
│       ├── components/# Shared UI components
│       ├── services/  # API clients, auth store, route plan store
│       └── utils/     # Map constraints, visual styles
├── backend/           # Express API server
│   └── src/
│       ├── modules/
│       │   ├── routes/              # Route planning, risk scoring, geography
│       │   ├── hazards/             # Hazard aggregation, adapters
│       │   ├── auth/                # Authentication, user profiles
│       │   ├── locations/           # Geocoding (Nominatim + Photon)
│       │   ├── communityReports/    # User-submitted hazards
│       │   └── knowledge/           # Educational articles
│       ├── infrastructure/          # Postgres client, caching
│       └── shared/                  # HTTP fetch utilities
├── ai-service/        # AI route narration service
├── shared/            # TypeScript type definitions
└── docs/              # Architecture and design docs
```

## Quick Start

```bash
# Install all workspaces
npm install

# Build shared types
npm --workspace shared run build

# Backend
cd backend
cp .env.example .env
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm run dev
```

## Deployment Notes

- Railway backend deploys from `backend/` and runs `npm ci`; keep `backend/package-lock.json` in sync whenever backend dependencies change.
- Vercel deploys the frontend from `frontend/` via the `npm run build` script in the root `package.json`.
