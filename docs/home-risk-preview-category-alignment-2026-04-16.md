# Home Risk Preview Category Alignment (2026-04-16)

Aligned the homepage risk preview map categorization with Risk Map so users can see finer-grained hazard categories directly on Home.

## Frontend updates

- Updated `frontend/src/views/Home.vue`:
  - Home preview hazard fetch now includes `trail` layer.
  - Type summary now tracks:
    - `fire`
    - `flood`
    - `storm`
    - `heat`
    - `trail`
    - `other`
  - Added `other` category summary chips (top 4 by count) to surface detailed subtype distribution.
  - Improved top hazard card subtitle for `other` hazards to show `riskCategory` instead of generic `other`.

- Updated `frontend/src/components/HomeRiskPreviewMap.vue`:
  - Added `trail` visual metadata.
  - Added Risk Map-style `other` subtype color assignment (stable hashed palette by category).
  - Added 3-zone risk coverage circles (5km/3km/1km) by severity, matching Risk Map style.
  - Popup now includes detailed `Category` information in addition to hazard type/severity.

## Result

Homepage map now presents category detail closer to `/risk-map`, rather than only broad hazard buckets.
