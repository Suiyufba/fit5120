# Mobile-First Adaptation (2026-03-28)

## Summary

Implemented the first mobile-first responsive pass for the user-facing HikeShield experience.

Targeted surfaces:

- Home
- Risk Map
- Plan Route
- Route Detail
- Community Reports
- Knowledge Hub
- Report Hazard
- Profile
- Login / Register / Forgot Password
- Shared Navbar / Footer
- Location Detail overlay

## Core UX Direction

- Phone web is the primary target.
- Map-heavy pages now use a mobile-oriented bottom-sheet pattern instead of forcing desktop sidebars into narrow widths.
- Shared spacing, safe viewport height, and mobile gutters were standardized in global CSS.

## Shared Frontend Changes

- File: `frontend/src/style.css`
  - Added shared mobile variables and responsive utility patterns.
  - Added reusable `mobile-sheet` classes for mobile map panels.
  - Added safe viewport height handling via `100dvh`-based variables.
  - Prevented horizontal overflow at the document level.
- File: `frontend/src/components/Navbar.vue`
  - Reduced mobile spacing and prevented account controls from overflowing.
- File: `frontend/src/components/SiteFooter.vue`
  - Reduced padding and rebalanced footer link columns for narrow screens.

## Page Updates

### Content / form pages

- `frontend/src/views/Home.vue`
  - Reduced hero density and mobile paddings.
  - Stacked CTA layout more cleanly on small screens.
  - Reduced overlapping decorative card collisions.
- `frontend/src/views/KnowledgeHub.vue`
  - Improved single-column reading flow and mobile image sizing.
- `frontend/src/views/ReportHazard.vue`
  - Reduced heading and form padding for phone screens.
- `frontend/src/views/Login.vue`
- `frontend/src/views/Register.vue`
- `frontend/src/views/ForgotPassword.vue`
- `frontend/src/views/Profile.vue`
  - Tightened mobile card spacing and maintained comfortable single-column forms.

### Map / route pages

- `frontend/src/views/RiskMap.vue`
  - Sidebar becomes a mobile bottom sheet.
  - Map remains the primary visual surface on phone.
- `frontend/src/views/RoutePlanner.vue`
  - Planner controls and route summary now sit in a mobile bottom sheet.
- `frontend/src/views/CommunityReports.vue`
  - Report form and feed now collapse into a mobile bottom sheet over the map.
- `frontend/src/views/RouteDetail.vue`
  - Right-hand detail panel becomes a mobile bottom sheet.
- `frontend/src/views/LocationDetail.vue`
  - Desktop right overlay becomes a mobile sheet-style overlay with a sticky header.

## Notes

- This pass focuses on user-facing pages only.
- Desktop behavior is preserved where possible.
- No backend/API contract changes were required.
