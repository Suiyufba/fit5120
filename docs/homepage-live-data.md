# Homepage Live Data (2026-03-28)

## Summary

Updated the homepage so the `Recent Community Alerts` and `Knowledge Hub` sections now render real database-backed content instead of hardcoded placeholder cards.

## Frontend Changes

- File: `frontend/src/views/Home.vue`
- Added homepage data loading for:
  - `fetchCommunityReports({ limit: 3 })`
  - `fetchKnowledgeArticles()`
- Replaced static `communityAlerts` content with the latest reports from the community reports API.
- Replaced static Knowledge Hub preview cards with live knowledge articles from the knowledge API.
- Added loading, empty, and error states for both homepage sections.
- The featured Knowledge Hub hero card now uses a real article image when available, with a styled fallback when no image exists.
- Homepage preview cards only render real records from the database and no longer inject fake editorial placeholder copy.

## Data Sources

### Recent Community Alerts

Homepage now reads from:

- `GET /api/community-reports?limit=3`

Displayed fields are derived from persisted report data:

- `title`
- `description`
- `severity`
- `locationName`
- `reporterName`
- `views`
- `reportedAt`

### Knowledge Hub

Homepage now reads from:

- `GET /api/knowledge/articles`

Displayed fields are derived from persisted article data:

- `title`
- `summary`
- `topic`
- `imageUrl`
- `publishedAt`
- `readMinutes`

## Notes

- Homepage no longer ships mock community alert copy.
- Homepage no longer ships mock knowledge article preview copy.
- If the database has no reports or no articles yet, the homepage now shows an explicit empty state instead of fake content.
