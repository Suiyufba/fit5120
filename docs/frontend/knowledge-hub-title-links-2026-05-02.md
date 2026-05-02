# Knowledge Hub Title Links (2026-05-02)

## Change

- Updated `frontend/src/views/KnowledgeHub.vue`.
- Knowledge Hub featured and regular article titles now link to each article's `sourceUrl` when one is available.
- Added hover and keyboard focus styling for title links while preserving the existing title typography.

## Interfaces

- No API or route changes.
- Uses the existing `sourceUrl` field returned by `GET /api/knowledge/articles`.

## User Impact

- Users can open an article directly from its title instead of only using the separate source link.
