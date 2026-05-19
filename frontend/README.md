# HikeShield Frontend

> Victorian hiking safety platform — route planning, live risk maps, and community
> intelligence in one trail companion.

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4fc08d?logo=vue.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwindcss)
![Leaflet](https://img.shields.io/badge/Leaflet-1.x-199900?logo=leaflet)
![Mapbox GL JS](https://img.shields.io/badge/Mapbox%20GL%20JS-3.x-4264fb?logo=mapbox)

## Features

- **Risk Map** — Statewide hazard overlay with severity zones and type filtering
  (fire, flood, storm, heat, trail). 60-second auto-refresh scoped to visible bounds.
- **Route Planner** — Pick start and end points on a Leaflet map, get safe routes
  from the backend with risk scoring, terrain profiles, and AI-generated introductions.
- **Route Detail** — 3D terrain inspection via Mapbox GL JS with full risk breakdown,
  scoring explanation, and suggested preparation tips.
- **Community Reports** — Browse and submit hazard sightings with photo upload.
  Reports auto-expire after 24 hours.
- **Knowledge Hub** — Curated hiking safety articles served from the backend database.
- **Authentication** — Register, login, password reset with JWT. Per-level risk
  thresholds (Newcomer / Intermediate / Advanced) affect route recommendations.
- **Location Detail** — View place information and nearby route options.

## Tech Stack

- **Framework**: Vue 3 + Vue Router (Composition API)
- **Styling**: Tailwind CSS + custom CSS variables (HS design tokens)
- **Maps**: Leaflet (2D), Mapbox GL JS (3D terrain)
- **State**: Reactive stores; auth uses backend HttpOnly cookies, route plans use sessionStorage
- **Build**: Vite
- **Deploy**: Vercel

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.vue              # Top navigation bar
│   │   ├── SiteFooter.vue          # Global footer
│   │   └── HomeRiskPreviewMap.vue  # Embedded risk preview on home page
│   ├── views/
│   │   ├── Home.vue                # Landing with preview map, alerts, articles
│   │   ├── RiskMap.vue             # Full-screen hazard map with severity zones
│   │   ├── RoutePlanner.vue        # Route planning with start/end pickers
│   │   ├── RouteDetail.vue         # 3D route inspection & risk breakdown
│   │   ├── CommunityReports.vue    # Browse community hazard reports
│   │   ├── ReportHazard.vue        # Submit a new hazard report
│   │   ├── KnowledgeHub.vue        # Safety articles browser
│   │   ├── LocationDetail.vue      # Location information page
│   │   ├── Login.vue               # Sign in
│   │   ├── Register.vue            # Create account
│   │   ├── ForgotPassword.vue      # Password reset via security question
│   │   └── Profile.vue             # User profile & settings
│   ├── services/
│   │   ├── hazardApi.ts            # Hazard feed fetching with local cache
│   │   ├── routeApi.ts             # Route planning API client
│   │   ├── routePlanStore.ts       # Session-persisted route plan state
│   │   ├── authApi.ts              # Auth API client
│   │   ├── authStore.ts            # Reactive auth state backed by HttpOnly cookie session
│   │   ├── communityReportApi.ts   # Community report CRUD
│   │   ├── knowledgeApi.ts         # Knowledge article fetching
│   │   ├── locationApi.ts          # Geocoding / reverse geocoding
│   │   └── localCache.ts           # Generic client-side cache helper (localStorage)
│   ├── router/
│   │   └── index.ts                # Route definitions & navigation guards
│   ├── utils/                      # Shared utility functions
│   ├── App.vue                     # Root component with site access gate
│   ├── main.ts                     # Application entry point
│   └── style.css                   # Global styles & HS design tokens
├── public/                         # Static assets
├── index.html                      # HTML template
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

## Quick Start

```bash
npm install
npm run dev            # → http://localhost:5173
npm run build          # production build → dist/
```

## Environment Variables

Copy `.env.example` to `.env`:

```env
VITE_HAZARD_API_BASE_URL=http://localhost:8080/api
```

- `VITE_HAZARD_API_BASE_URL` — Backend API base URL. The frontend appends
  path segments (`/hazards/realtime`, `/routes/plan`, etc.).

## API Integration

The frontend polls the backend every 60 seconds for hazard updates:

```
GET /hazards/realtime?bbox=west,south,east,north&layers=fire,flood,storm,heat
```

Route planning supports both authenticated and anonymous users:

```
POST /routes/plan   (auth cookie optional)
```

Anonymous route history is tracked via `X-Plan-Session-Id` (UUID in sessionStorage).

## Design Tokens

The HikeShield visual identity uses a nature-inspired palette defined as CSS
custom properties in `src/style.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--hs-ink` | `#132b23` | Primary text |
| `--hs-ink-soft` | `#405a51` | Secondary text |
| `--hs-forest` | `#21483b` | Brand accents, buttons |
| `--hs-forest-2` | `#386653` | Hover states |
| `--hs-moss` | `#8fae83` | Highlight overlays |
| `--hs-cream` | `#f7f2e9` | Warm background |
| `--hs-paper` | `#fffaf2` | Card / panel backgrounds |
| `--hs-sage` | `#e7eee4` | Section backgrounds |

**Fonts**: IBM Plex Sans (body), Fraunces (headings)

## Map Strategy

| View | Library | Base Map | Purpose |
|------|---------|----------|---------|
| Route Planner | Leaflet | Switchable (Voyager / Positron / OpenTopoMap) | Route selection, hazard overlay |
| Route Detail | Mapbox GL JS | Outdoors v12 with 3D terrain | Detailed route inspection |
| Risk Map | Leaflet | OpenTopoMap | Statewide hazard browsing |
| Home Preview | Leaflet | Positron | Embedded risk preview |
| Community Reports | Leaflet | OpenTopoMap | Report placement |

All Leaflet maps are constrained to Victoria's bounding box and share the same
hazard zone rendering (concentric circles at 1 km / 3 km / 5 km with
severity-dependent opacity).

## License

MIT
