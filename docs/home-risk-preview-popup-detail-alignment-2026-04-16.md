# Home Risk Preview Popup Detail Alignment (2026-04-16)

Aligned the homepage map marker popup content with Risk Map detail popup fields.

## Frontend changes

- Updated `frontend/src/components/HomeRiskPreviewMap.vue` marker popup content:
  - Added description text (with HTML cleanup).
  - Added severity label formatting (`Extreme/High/Moderate/Low`).
  - Added detailed fields:
    - `Category`
    - `Updated`
    - `Source`
- Kept existing category-aware visuals (including `other` subtype color mapping and risk zone circles).

## Result

Users can now click hazards on homepage preview map and see detailed information similar to `/risk-map` popup cards.
