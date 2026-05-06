# Worker

Async job workers for scheduled tasks and heavy background processing.

## Status

This package is a placeholder — no workers are implemented yet.

## Planned Capabilities

- Cron-based ingestion job for open data sources (VicEmergency, DataVic, OpenWeather)
- Queue consumers for enrichment and geocoding tasks
- Scheduled cleanup of expired community reports (currently handled in-process by the backend)

## Running

```bash
npm --workspace worker start
```

Configure concurrency via the `WORKER_CONCURRENCY` environment variable (default: 2).
