# Community Report Map Popup Thumbnail (2026-05-04)

## Summary

- Added optional report photo thumbnails to community report map popups.
- The map popup now renders `report.imageUrl` when present.
- Existing report pins, upload flow, and backend image serving are unchanged.

## Frontend Surface

- Page: `frontend/src/views/CommunityReports.vue`
- Popup helper: `buildReportPopup(report, meta)`
- Thumbnail class: `.community-report-popup__thumb`

## Why

Community reports could already upload and store thumbnails, but the map popup template only rendered title, type, severity, location, and description. Reports with attached photos therefore appeared on the map without their thumbnail.

## Notes

- Reports without `imageUrl` keep a text-only popup.
- Thumbnail URLs are escaped before being inserted into Leaflet popup HTML.
