# Railway Deployment Backup - 2026-04-20

This document is the Railway production backup and redeploy guide captured with Railway CLI.

## Current Railway Snapshot

- Workspace: `suiyufba's Projects`
- Project: `innovative-imagination`
- Project ID: `f0312895-e09f-461a-87b5-3f18576b34f9`
- Environment: `production`
- Environment ID: `6fcb312e-385e-4182-b597-2d728a1e4ae7`

## Services

### Backend

- Service name: `后端各种服务`
- Service ID: `33919422-2a32-415d-a130-c9e8016ed64a`
- Status at backup time: `SUCCESS`
- Latest deployment: `08c22ba0-a3a1-41df-84ba-18d6ff047340`
- Public domain: `https://backend-production-f55c.up.railway.app`
- Health check URL: `https://backend-production-f55c.up.railway.app/api/health`
- API base URL: `https://backend-production-f55c.up.railway.app/api`
- Source repo: `Suiyufba/HikeShield`
- Branch: `main`
- Root directory: `/backend`
- Config file: `backend/railway.json`
- Builder: Railway Railpack / Node
- Node resolved version: `20.20.2`
- Runtime: Railway V2
- Region replica config: `us-west2`, `numReplicas=1`
- Custom domains on Railway: none
- Current deployment commit: `572a5e034bb7f6d664dac5b17f57dfc95e5b1d21`
- Current deployment commit message: `Remove route planner lock notice`

### Postgres

- Service name: `Postgres`
- Service ID: `2d37d7db-59fa-4fee-89ee-53569ae99c6b`
- Status at backup time: `SUCCESS`
- Latest deployment: `0aeea83f-ec29-4865-9079-bc1446ce81a8`
- Image: `ghcr.io/railwayapp-templates/postgres-ssl:18`
- Volume name: `postgres-volume`
- Volume ID: `2483228e-c393-436e-90b0-06f712d76968`
- Volume mount path: `/var/lib/postgresql/data`
- Volume size at backup time: about `119.33 MB` used of `500 MB`

## Backed Up Files

- Backend variables: `docs/ops/railway-backend-production.env`
- Postgres variables: `docs/ops/railway-postgres-production.env`
- Railway deploy manifest: `backend/railway.json`

The `.env` files intentionally contain production secrets because this repository is private. Rotate the secrets if this repo is ever made public or shared outside the project team.

## Current Backend Variables

Use `docs/ops/railway-backend-production.env` as the source of truth. The variables currently required by the backend service are:

```env
ADMIN_EMAILS=1178804854@qq.com,1795062361@qq.com,admin@123.com
AUTH_CODE_EXPIRES_MINUTES=10
AUTH_JWT_SECRET=ed42e6b9549d3ff2ca42852a0144c7727650ebc0e440ffba7fa48f86bd7cc924
CORS_ORIGIN=https://gohiking.me,https://www.gohiking.me,https://fit5120-suiyufbas-projects.vercel.app,https://fit5120-git-main-suiyufbas-projects.vercel.app,http://localhost:5173
DATABASE_URL=postgresql://postgres:GnafVrdhgpzinUKZmOhhDXpJJKbLEOZR@postgres.railway.internal:5432/railway
DEFAULT_LAYERS=fire,flood,storm,heat
FETCH_INTERVAL_MS=7200000
OPENWEATHER_API_KEY=ab4ecbe3f75ec93682684c8967bffaa7
OPENWEATHER_API_URL=https://api.openweathermap.org/data/2.5/weather
REQUEST_TIMEOUT_MS=10000
SMTP_FROM=goHiking <1795062361@qq.com>
SMTP_HOST=smtp.qq.com
SMTP_PASS=tprujmgbtrysceee
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=1795062361@qq.com
VICROADS_API_KEY=23466b04-71ef-4e83-a598-f9212c6a2094
VICROADS_API_URL=https://api.opendata.transport.vic.gov.au/opendata/roads/disruptions/unplanned/v2?limit=100&page=1
VIC_EMERGENCY_FEED_URL=https://data.emergency.vic.gov.au/Show?pageId=getIncidentRSS
```

Do not copy the old `DATABASE_URL` into a new Railway project unless the backend is still in the same project/network as the old Postgres service. For a new Railway project, create a new Postgres service first and use that new service's internal `DATABASE_URL`.

## Redeploy To A New Railway Project With CLI

Run these commands from the repository root unless stated otherwise.

### 1. Login And Create/Link Project

```bash
railway login
railway init
railway environment new production
railway environment link production
```

If the new project already exists, link it instead:

```bash
railway project link
railway environment link production
```

### 2. Add Postgres

```bash
railway add --database postgres --json
```

After Postgres is created, capture its new variables:

```bash
railway variable list --service Postgres --environment production --kv
```

Copy the new Postgres `DATABASE_URL`. It will usually look like:

```env
DATABASE_URL=postgresql://postgres:<new-password>@postgres.railway.internal:5432/railway
```

### 3. Add Backend Service

Either connect the GitHub repo in the Railway dashboard:

- Repo: `Suiyufba/HikeShield`
- Branch: `main`
- Root directory: `/backend`
- Config file: `backend/railway.json`
- Build command: leave default
- Start command: leave default; `backend/package.json` uses `npm start`

Or deploy directly with CLI from the backend directory:

```bash
cd backend
railway add --service "后端各种服务"
railway up --service "后端各种服务" --environment production . --path-as-root --detach
```

For long-term automatic deployments from GitHub, prefer the dashboard repo connection and root directory `/backend`.

### 4. Set Backend Variables

Set variables on the new backend service. Replace `DATABASE_URL` with the new Postgres internal URL from step 2. Keep the rest from `docs/ops/railway-backend-production.env` unless you are rotating secrets.

```bash
railway variable set --service "后端各种服务" --environment production \
  'ADMIN_EMAILS=1178804854@qq.com,1795062361@qq.com,admin@123.com' \
  'AUTH_CODE_EXPIRES_MINUTES=10' \
  'AUTH_JWT_SECRET=ed42e6b9549d3ff2ca42852a0144c7727650ebc0e440ffba7fa48f86bd7cc924' \
  'CORS_ORIGIN=https://gohiking.me,https://www.gohiking.me,https://fit5120-suiyufbas-projects.vercel.app,https://fit5120-git-main-suiyufbas-projects.vercel.app,http://localhost:5173' \
  'DATABASE_URL=postgresql://postgres:<new-password>@postgres.railway.internal:5432/railway' \
  'DEFAULT_LAYERS=fire,flood,storm,heat' \
  'FETCH_INTERVAL_MS=7200000' \
  'OPENWEATHER_API_KEY=ab4ecbe3f75ec93682684c8967bffaa7' \
  'OPENWEATHER_API_URL=https://api.openweathermap.org/data/2.5/weather' \
  'REQUEST_TIMEOUT_MS=10000' \
  'SMTP_FROM=goHiking <1795062361@qq.com>' \
  'SMTP_HOST=smtp.qq.com' \
  'SMTP_PASS=tprujmgbtrysceee' \
  'SMTP_PORT=587' \
  'SMTP_SECURE=false' \
  'SMTP_USER=1795062361@qq.com' \
  'VICROADS_API_KEY=23466b04-71ef-4e83-a598-f9212c6a2094' \
  'VICROADS_API_URL=https://api.opendata.transport.vic.gov.au/opendata/roads/disruptions/unplanned/v2?limit=100&page=1' \
  'VIC_EMERGENCY_FEED_URL=https://data.emergency.vic.gov.au/Show?pageId=getIncidentRSS'
```

### 5. Generate The New Railway Public Domain

```bash
railway domain --service "后端各种服务"
```

Railway will return a new `*.up.railway.app` domain. Use that domain for the frontend API base URL.

### 6. Update Frontend/Vercel

In the frontend deployment environment, set:

```env
VITE_HAZARD_API_BASE_URL=https://<new-railway-domain>/api
```

Then make sure the backend `CORS_ORIGIN` includes every frontend domain that will call the API.

Current allowed origins are:

```text
https://gohiking.me
https://www.gohiking.me
https://fit5120-suiyufbas-projects.vercel.app
https://fit5120-git-main-suiyufbas-projects.vercel.app
http://localhost:5173
```

### 7. Verify

```bash
curl https://<new-railway-domain>/api/health
curl "https://<new-railway-domain>/api/hazards/realtime?layers=fire,flood,storm,heat"
```

Also test from the frontend:

- Login/register
- Route planner
- Risk map
- Community reports
- Forgot password email flow

## Database Data Migration

The backend creates required tables automatically on startup, so a fresh Postgres is enough for an empty redeploy.

If production user/report/history data must be carried over, dump the old database and restore it into the new Railway Postgres. The local machine used for the backup did not have `pg_dump` installed at backup time, so install PostgreSQL client tools first.

Example:

```bash
# Old public URL from docs/ops/railway-postgres-production.env
export OLD_DATABASE_PUBLIC_URL='postgresql://postgres:GnafVrdhgpzinUKZmOhhDXpJJKbLEOZR@gondola.proxy.rlwy.net:34825/railway'

# New public URL from the new Railway Postgres service
export NEW_DATABASE_PUBLIC_URL='postgresql://postgres:<new-password>@<new-proxy-host>:<new-proxy-port>/railway'

pg_dump "$OLD_DATABASE_PUBLIC_URL" --format=custom --no-owner --no-privileges --file railway-prod-2026-04-20.dump
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$NEW_DATABASE_PUBLIC_URL" railway-prod-2026-04-20.dump
```

After restore, restart the backend:

```bash
railway restart --service "后端各种服务" --environment production
```

## Useful Railway CLI Commands

```bash
railway status --json
railway service status --service "后端各种服务" --environment production
railway service status --service Postgres --environment production
railway variable list --service "后端各种服务" --environment production --kv
railway variable list --service Postgres --environment production --kv
railway logs --service "后端各种服务" --environment production --lines 100
railway logs --service "后端各种服务" --environment production --http --status ">=400" --lines 50
railway redeploy --service "后端各种服务" --environment production
railway restart --service "后端各种服务" --environment production
```

## Notes

- `backend/railway.json` only sets restart behavior: `ON_FAILURE`, max retries `10`.
- Current backend deployment does not define a custom healthcheck path in Railway config.
- Current backend service has no custom domain in Railway; production frontend likely calls the Railway public domain or a Vercel-configured API base URL.
- For a new Railway project, do not set Railway-generated variables such as `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_PUBLIC_DOMAIN`, or `RAILWAY_STATIC_URL` manually. Railway will inject new values.
