# Hazard History Retention Update (2026-04-14)

## Summary

Implemented historical retention for hazard snapshots in PostgreSQL.

Before this update, the system only stored one latest snapshot row (`hazard_latest_snapshot`, `id=1`), and each refresh replaced that row.

Now, each snapshot refresh:

- Updates `hazard_latest_snapshot` (for realtime reads)
- Appends a row to `hazard_snapshot_history` (for historical tracking)

## What Changed

- Added database table `hazard_snapshot_history` with index on `fetched_at DESC`
- Updated snapshot persistence logic to run in a transaction:
  - upsert latest snapshot
  - insert history snapshot
- Added new read API endpoint for history:
  - `GET /api/hazards/history?limit=24`
  - Returns recent snapshot metadata (`id`, `fetchedAt`, `recordedAt`, `hazardCount`, `fromFallback`, `lastError`)
- Updated knowledge table auto-discovery exclusions to avoid matching the new history table

## Backend Files

- `backend/src/infrastructure/db/hazardSnapshotRepository.js`
- `backend/src/controllers/hazardsController.js`
- `backend/src/routes/hazardRoutes.js`
- `backend/src/modules/knowledge/repositories/articleRepository.js`

## API

### New Endpoint

- `GET /api/hazards/history`

Query params:

- `limit` (optional, integer > 0, default `24`, max `500`)

Response example:

```json
{
  "snapshots": [
    {
      "id": 128,
      "fetchedAt": "2026-04-14T02:30:00.000Z",
      "recordedAt": "2026-04-14T02:30:00.100Z",
      "fromFallback": false,
      "lastError": null,
      "hazardCount": 18
    }
  ],
  "fetchedAt": "2026-04-14T02:30:05.000Z"
}
```
