# Deployment Guide

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Vercel  │────▶│ Railway  │────▶│ Railway  │
│ Frontend │     │ Backend  │     │ai-service│
│  (Vite)  │     │(Express) │     │(Express) │
└──────────┘     └────┬─────┘     └──────────┘
                      │
                 ┌────┴─────┐
                 │Postgres   │
                 │(Railway)  │
                 └──────────┘
```

- **Frontend** — Vite + Vue 3, deployed on **Vercel**. Connects to backend via `VITE_HAZARD_API_BASE_URL`.
- **Backend** — Express + TypeScript, deployed on **Railway**. Aggregates hazard data, handles auth, serves API.
- **AI Service** — Node.js + Express, deployed on **Railway** (separate service). Provides route narration via Gemini.
- **Database** — PostgreSQL, provisioned inside Railway alongside the backend.

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Build shared types (required before backend/frontend typecheck)
npm --workspace shared run build

# 3. Start backend (port 8080)
npm start

# 4. Start ai-service (port 8090, optional — only needed for route narration)
npm run start:ai-service

# 5. Start frontend (port 5173)
npm run dev:frontend
```

All services default to `localhost` ports listed above. Copy `.env.example` to `.env` and fill in the required keys before starting.

## Environment Variables

### Required for production

| Variable | Service | Notes |
|---|---|---|
| `CORS_ORIGIN` | Backend | Comma-separated origins, no wildcard |
| `AUTH_JWT_SECRET` | Backend | Min 32 characters |
| `OPENROUTESERVICE_API_KEY` | Backend | Route planning API |
| `PUBLIC_API_ORIGIN` | Backend | Canonical backend origin, e.g. `https://hikeshield-backend.railway.app`. Railway's `RAILWAY_PUBLIC_DOMAIN` is used automatically when this is unset. |
| `GEMINI_API_KEY` | AI-Service | Route narration |
| `AI_SERVICE_AUTH_TOKEN` | AI-Service | Shared service token, required by ai-service in production |
| `VITE_HAZARD_API_BASE_URL` | Frontend | Backend public API URL, including `/api` |
| `VITE_SITE_ACCESS_PASSWORD` | Frontend | Preview gate password; client-visible, not backend auth |

### Recommended for production

| Variable | Service | Notes |
|---|---|---|
| `DATABASE_URL` | Backend | Otherwise falls back to in-memory (data lost on restart) |
| `REDIS_URL` | Backend | Rate limiting and caching |
| `OPENWEATHER_API_KEY` | Backend | Weather hazard layer |
| `VIC_EMERGENCY_FEED_URL` | Backend | Victoria emergency feed |
| `KNOWLEDGE_ARTICLE_TABLE` | Backend | Explicit table for knowledge articles, skips auto-discovery |
| `AI_SERVICE_AUTH_TOKEN` | Backend | Set to the same token as ai-service to enable AI narration; backend falls back when omitted |

See `.env.example` for the full list with defaults.

## Vercel (Frontend)

1. Connect your GitHub repo to Vercel.
2. Set **Root Directory** to `frontend`.
3. Set **Build Command**: `npm run build` (Vercel auto-detects Vite).
4. Set **Output Directory**: `dist`.
5. Add environment variable in Vercel dashboard:
   - `VITE_HAZARD_API_BASE_URL` = your Railway backend API URL (e.g. `https://hikeshield-backend.railway.app/api`)
   - `VITE_SITE_ACCESS_PASSWORD` = preview gate password

## Railway (Backend)

1. Create a new Railway project from your GitHub repo.
2. Set **Root Directory** to `.` (monorepo root).
3. Set **Start Command**: `npm start` (runs `npm --prefix backend start`).
4. Add a PostgreSQL plugin to the same Railway project.
5. Set all required environment variables in the Railway dashboard (see table above).
6. `DATABASE_URL` is auto-populated when you add the PostgreSQL plugin.

## Railway (AI Service)

1. Create a **separate Railway service** from the same GitHub repo.
2. Set **Root Directory** to `ai-service`.
3. Set **Start Command**: `npm start` (runs `node src/server.js`).
4. Add `GEMINI_API_KEY` and an `AI_SERVICE_AUTH_TOKEN` of your choice.
5. Set the same `AI_SERVICE_AUTH_TOKEN` in the backend's environment variables.

## Startup Order

1. **PostgreSQL** (Railway auto-starts when provisioned)
2. **AI Service** (Railway) — optional but recommended
3. **Backend** (Railway) — initializes database tables on first boot
4. **Frontend** (Vercel) — CDN deployment

The backend will log a warning if optional services (database, Redis, AI) are unavailable but will continue running with in-memory fallbacks.
