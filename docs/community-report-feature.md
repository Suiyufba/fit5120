# Community Report Feature + API (2026-03-28)

## Summary

Implemented an end-to-end `community report` workflow:

- Users can submit hazard reports from `ReportHazard` page.
- Community report list page now loads live data from backend API.
- Backend persists reports into Railway Postgres when `DATABASE_URL` is configured.
- Backend falls back to in-memory store only when DB is unavailable.
- Community report page now supports same-page submission with map point selection.
- Right-side map now overlays official risk layers and user submitted report markers.
- Community report API now supports multi-endpoint fallback to reduce 404 from stale base URLs.
- Map zoom controls were moved to bottom-right on both Community Reports and Plan Route pages.
- Community Reports legend now explicitly includes Heat and Other risk layer color classification.

## Frontend Changes

### 1) New API service

- File: `frontend/src/services/communityReportApi.js`
- Added:
  - `fetchCommunityReports({ limit })`
  - `submitCommunityReport(input)`

### 2) Report submission page

- File: `frontend/src/views/ReportHazard.vue`
- Updated from static UI to working form submission flow:
  - Collects title/description/type/severity/location/lat/lng/reporter/imageUrl.
  - Calls `submitCommunityReport` on submit.
  - Shows success/failure feedback.
  - Redirects to `/community-reports` after success.

### 3) Community report list page

- File: `frontend/src/views/CommunityReports.vue`
- Updated from hardcoded mock cards to API-driven feed:
  - Fetches report list from backend.
  - Auto refresh every 60 seconds.
  - Displays DB mode (`Railway DB` or fallback mode).
  - Renders summary counters and map markers derived from report coordinates.

## Backend Changes

### 1) New repository for community reports

- File: `backend/src/modules/communityReports/repositories/communityReportRepository.js`
- Added:
  - Table init (`community_reports`)
  - Input validation
  - DB query methods for list/create
  - In-memory fallback data store

### 2) New controller

- File: `backend/src/controllers/communityReportsController.js`
- Added:
  - `getCommunityReports`
  - `postCommunityReport`

### 3) New route

- File: `backend/src/routes/communityReportsRoutes.js`
- Added endpoints:
  - `GET /api/community-reports`
  - `POST /api/community-reports`

### 4) Route registration + server boot init

- Updated files:
  - `backend/src/routes/index.js`
  - `backend/src/server.js`
- Registered `communityReportsRoutes` and `initCommunityReportStore()`.

## API Contract

### GET `/api/community-reports`

Query params:

- `limit` (optional, integer, default 50, max 100)

Response `200`:

```json
{
  "reports": [
    {
      "id": "uuid",
      "title": "Smoke near Cathedral Range",
      "description": "...",
      "hazardType": "fire",
      "severity": "high",
      "locationName": "Neds Gully Track, Cathedral Range",
      "latitude": -37.507,
      "longitude": 145.712,
      "imageUrl": "",
      "reporterName": "Local Hiker",
      "likes": 12,
      "views": 450,
      "reportedAt": "2026-03-28T...Z"
    }
  ],
  "storage": "database",
  "fetchedAt": "2026-03-28T...Z"
}
```

### POST `/api/community-reports`

Request body:

```json
{
  "title": "Fallen tree near summit track",
  "description": "Large tree blocks the main line",
  "hazardType": "trail",
  "severity": "high",
  "locationName": "Mt Buller West Ridge",
  "latitude": -37.145,
  "longitude": 146.428,
  "reporterName": "Weekend Group",
  "imageUrl": ""
}
```

Validation:

- Required: `title`, `description`, `locationName`
- `hazardType` in: `fire|flood|storm|trail|other`
- `severity` in: `low|moderate|high|extreme`
- `latitude`, `longitude` must be valid numeric coordinates

Response `201`:

```json
{
  "report": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "hazardType": "trail",
    "severity": "high",
    "locationName": "...",
    "latitude": -37.145,
    "longitude": 146.428,
    "imageUrl": "",
    "reporterName": "Weekend Group",
    "likes": 0,
    "views": 0,
    "reportedAt": "2026-03-28T...Z"
  },
  "storage": "database"
}
```

Response `400` (validation error):

```json
{
  "error": "validation message"
}
```

Response `500` (server error):

```json
{
  "error": "Failed to submit community report"
}
```
