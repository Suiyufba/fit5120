# Route Geography: Elevation Fallback Provider (2026-04-18)

## Goal
- Fix Route Geography Profile frequently returning all-zero elevation values when one upstream provider fails.

## Root Cause
- Elevation was fetched from a single provider (OpenTopoData).
- In production, when OpenTopoData call failed or returned unusable payload, ascent/descent/slope stayed zero.

## Changes
- Updated `backend/src/modules/routes/services/routeGeographyService.js`.
- Added provider fallback flow for elevation:
  1. OpenTopoData (primary)
  2. Open-Meteo elevation API (fallback)
- Refactored elevation profile calculation into shared logic to ensure consistent metrics across providers.
- Added warning logs that clearly indicate which provider failed and when fallback is used.
- Added new config key in `backend/src/config/index.js`:
  - `OPEN_METEO_ELEVATION_API_URL` (default `https://api.open-meteo.com/v1/elevation`)

## Impact
- Geography Profile is much less likely to show all zeros for ascent/descent/slope.
- Route-risk calculations that depend on geography become more stable when one elevation provider is degraded.
