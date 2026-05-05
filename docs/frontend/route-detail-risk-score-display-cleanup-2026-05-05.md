# Route Detail Risk Score Display Cleanup (2026-05-05)

## Change
- Updated `frontend/src/views/RouteDetail.vue`.
- Route Detail now displays risk labels only in the route option cards and summary metric grid.
- Removed the parenthesized numeric risk score from user-facing Route Detail risk text.

## User Impact
- Users see cleaner risk labels such as `Low`, `Moderate`, or `High` without extra score values like `(23.5)`.
- Risk scoring data remains available internally for route selection and backend logic.
