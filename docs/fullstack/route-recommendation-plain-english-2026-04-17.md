# Route Recommendation Plain-English Update (2026-04-17)

## Background
- Users found recommendation copy too technical and hard to understand.
- `L1 / L2 / L3` zone references caused confusion.

## Backend Changes
- File: `backend/src/modules/routes/domain/routeRisk.js`
- Simplified recommendation/explanation sentences to plain English:
  - closure explanation
  - long-route explanation
  - hazard proximity explanation
  - hazard advice by type (`fire/flood/storm/heat/other`)
- Removed zone-level wording from recommendation text templates.

## Frontend Changes
- Removed `L1/L2/L3` zone summary lines from Plan Route and Route Detail views.
- Removed `zoneLabel` from risk item display sentence.

## API Impact
- No breaking API changes.
- `zoneSummary` / `zoneLabel` fields remain in payload for compatibility, but are no longer shown in recommendation UI.
