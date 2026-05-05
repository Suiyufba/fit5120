# HikeShield

A hiking safety platform for Victoria, Australia. Provides route planning with real-time hazard assessment, personalized risk scoring, and AI-powered safety recommendations.

## Key Features

- **Plan Safe Route** — Pick two points on a map, get multiple route candidates ranked by safety. Each route is scored against live hazards (fire, flood, storm, heat) and terrain conditions.
- **Risk Map** — Interactive map showing active hazards across Victoria with severity zones.
- **Community Reports** — Crowd-sourced hazard reports with photo upload.
- **Knowledge Hub** — Educational articles on hiking safety.
- **User Profiles** — Experience-level assessment that personalizes risk thresholds and preparation advice.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API), Leaflet (2D maps), Mapbox GL JS (3D terrain), Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| External APIs | OpenRouteService (directions), OpenTopoData + Open-Meteo (elevation), Overpass API (OSM terrain), VicEmergency (hazards), OpenWeather (weather) |
| AI Service | External narration API (route introductions) |
| Hosting | Railway |

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
│       │   ├── routes/        # Route planning, risk scoring, geography
│       │   ├── hazards/       # Hazard aggregation, adapters
│       │   ├── auth/          # Authentication, user profiles
│       │   ├── locations/     # Geocoding (Nominatim + Photon)
│       │   └── communityReports/
│       ├── infrastructure/    # Postgres client, caching
│       └── shared/            # HTTP fetch utilities
├── ai-service/        # External AI narration service
├── shared/            # Shared constants/types
└── docs/              # Architecture and design docs
```

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env  # configure API keys
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env  # set VITE_HAZARD_API_BASE_URL
npm install
npm run dev
```

## Deployment Notes

- Railway backend deploys from `backend/` and runs `npm ci`; keep `backend/package-lock.json` in sync whenever backend dependencies or devDependencies change.
