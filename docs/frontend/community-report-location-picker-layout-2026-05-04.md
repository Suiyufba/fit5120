# Community Report Location Picker Layout (2026-05-04)

## Summary

- Reordered the community report location picker controls.
- The address search field now appears on the first row.
- `Use My Location` now appears on the second row, aligned to the left on desktop and full width on mobile.
- After `Use My Location` succeeds, the reverse-geocoded current address appears in the search field.

## Frontend Surface

- Page: `frontend/src/views/CommunityReports.vue`
- Section: `Pick Report Location`

## Notes

- Existing location search and GPS selection still use the same APIs.
