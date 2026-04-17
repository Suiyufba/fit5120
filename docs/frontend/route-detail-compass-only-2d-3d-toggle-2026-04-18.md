# Route Detail: Compass-Only 2D/3D Toggle (2026-04-18)

## Goal
- Remove panel-based 3D controls and keep only map control-based toggling.
- Use the compass button under zoom controls as the only 2D/3D switch.

## Changes
- Updated `frontend/src/views/RouteDetail.vue`.
- Removed all panel 3D hints/buttons from Route Detail.
- Bound Mapbox compass control click behavior to terrain mode toggle:
  - first click switches to route-focused 3D terrain view
  - next click switches back to 2D top-down view
- Kept zoom controls and compass control in map UI.

## Impact
- Cleaner Route Detail panel with no duplicate 3D controls.
- Users switch 2D/3D using only the map's built-in control area.
