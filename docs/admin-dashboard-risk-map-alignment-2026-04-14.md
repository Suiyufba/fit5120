# Admin Dashboard Risk Map Alignment (2026-04-14)

## Summary

Aligned the Admin Dashboard map behavior with the Risk Map and Community Report pages so risk categories are shown more precisely and visually.

## Frontend Changes

- File: `frontend/src/views/AdminDashboard.vue`
- Updated official realtime hazard fetch layers from:
  - `fire,flood,storm,heat,other`
  to:
  - `fire,flood,storm,heat,trail,other`
- Added dynamic visual mapping for `other` sub-categories:
  - Uses `riskCategory` when available.
  - Assigns stable colors to different `other` category keys.
- Updated official hazard markers:
  - No navigation behavior.
  - Click shows popup above marker with title, description, severity, category, and source.
  - Marker color now reflects actual hazard category (including `other` sub-categories), instead of fixed gray.
- Updated editable risk/report marker popups:
  - Show specific category and severity details.
  - Avoid generic `Other` display when backend/category content exists.
- Updated map legend:
  - Dynamically lists visible official hazard categories with count.
  - Keeps editable layer legend entries for manual risks and community reports.

## API / Data Notes

- Reused existing `GET /api/hazards/realtime` endpoint.
- No backend schema or endpoint changes in this update.

