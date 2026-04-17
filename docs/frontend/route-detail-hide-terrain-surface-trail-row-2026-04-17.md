# Route Detail: Hide Terrain/Surface/Trail Row (2026-04-17)

## Goal
- Simplify the `Geography Profile` section in Route Detail.
- Remove the row:
  - `Terrain ... · Surface ... · Trail ...`

## Changes
- Updated:
  - `frontend/src/views/RouteDetail.vue`
- In `Geography Profile`, removed the middle `tip-item` row that displayed terrain/surface/trail labels.
- Kept:
  - Ascent/Descent/Max slope row
  - Rivers/Cliffs/Closures row

## Impact
- Route Detail is cleaner and avoids showing low-value terms like `mixed`/`unknown`.
