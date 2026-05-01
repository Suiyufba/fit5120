# Route Planner OpenRouteService Migration - 2026-05-01

## Summary

The route planner now uses OpenRouteService Directions API instead of the public OSRM demo endpoint.

## Why

The public OSRM endpoint intermittently returned upstream `502 Bad Gateway` responses for route requests, which made `POST /api/routes/plan` fail even though the Railway backend was healthy.

## Runtime Configuration

Railway production must provide:

```env
OPENROUTESERVICE_API_BASE_URL=https://api.openrouteservice.org
OPENROUTESERVICE_API_KEY=<OpenRouteService API key>
OPENROUTESERVICE_PROFILE=foot-hiking
OPENROUTESERVICE_SNAP_RADIUS_M=1000
```

`OPENROUTESERVICE_API_KEY` is required outside `NODE_ENV=test`.

## Backend Behavior

- `backend/src/modules/routes/adapters/openRouteServiceAdapter.js` calls:
  - `POST /v2/directions/{profile}/geojson`
  - default profile: `foot-hiking`
  - fallback profiles: `foot-walking`, then `driving-car`
- Request bodies use `[lng, lat]` coordinates.
- `radiuses` defaults to `1000` meters for each waypoint so map-picked points can snap to nearby routable paths.
- Response geometry is converted back to the app's `[lat, lng]` format.
- Transient upstream statuses (`429`, `500`, `502`, `503`, `504`) are retried once per profile.
- If all profiles fail, the API returns a `503` route-planning error instead of a generic `500`.

## Verification

- Local backend tests cover:
  - OpenRouteService request shape
  - retry on transient `502`
  - profile fallback from `foot-hiking` to `foot-walking`
- Production should be verified with:

```bash
curl -sS https://backend-production-f55c.up.railway.app/api/routes/plan \
  -H 'content-type: application/json' \
  --data '{"start":{"lng":144.593712,"lat":-37.022341},"end":{"lng":144.47465,"lat":-37.017629}}'
```
