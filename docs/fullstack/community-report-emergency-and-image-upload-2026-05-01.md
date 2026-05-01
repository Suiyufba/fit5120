# Community Reports — Emergency Prompt + Image Thumbnail Upload — 2026-05-01

## Summary

Two related improvements to the Community Reports flow:

1. **Emergency prompt.** The first time a user opens the Community Reports
   page in a session, a modal asks "Is this an emergency?". Choosing **Yes**
   navigates the browser to `tel:000` (Australia's national emergency number).
   Choosing **No** dismisses the modal and falls back to the normal
   pick-location → submit-report flow. Dismissal is remembered for the
   session via `sessionStorage`.

2. **Photo thumbnail upload.** The free-form `Image URL` field is replaced
   with a real file picker. The browser resizes the picked image to a small
   JPEG thumbnail (max 480×480, q≈0.78) before uploading; the full-size
   photo never leaves the device. The backend stores the thumbnail bytes in
   a new Postgres table and serves them back over a public URL that gets
   attached to the submitted report.

## Backend changes

- New table `community_report_images`:
  - `id TEXT PRIMARY KEY`
  - `report_id TEXT` (nullable, reserved for future linking)
  - `mime_type TEXT NOT NULL` — restricted to `image/jpeg|png|webp`
  - `width INTEGER`, `height INTEGER`, `byte_size INTEGER`
  - `thumbnail BYTEA NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- New repository: `backend/src/modules/communityReports/repositories/communityReportImageRepository.js`
  - Decodes a base64 `data:` URL, validates MIME and ≤512 KB, persists.
  - Falls back to in-memory storage when `DATABASE_URL` is unset (parity
    with the existing community reports repository pattern).
- New routes (registered in `communityReportsRoutes.js`):
  - `POST /api/community-reports/images` — upload a thumbnail and receive
    `{ id, url, byteSize, storage }`.
  - `GET  /api/community-reports/images/:id` — serve the stored bytes with
    immutable cache headers.
- `normalizeImageUrl` in the report repository now always allows URLs whose
  path starts with `/api/community-reports/images/`, so dev/local hosts
  work without loosening the public-host allowlist for arbitrary URLs.
- Express body limit raised from `1mb` to `2mb` to comfortably fit the
  base64 thumbnail payload (~30–50 KB after resize).
- `server.js` boots `initCommunityReportImageStore()` alongside the other
  store initializers.
- The Postgres table was provisioned on Railway's `Postgres` service via
  the Railway CLI (`psql` over the `DATABASE_PUBLIC_URL` proxy) so the
  schema exists ahead of the next backend deploy. The boot-time
  `CREATE TABLE IF NOT EXISTS` is idempotent and will keep working for
  fresh environments.

## Frontend changes

- `frontend/src/services/communityReportApi.js` exposes a new
  `uploadCommunityReportImage({ dataUrl, width, height, signal })`.
- `frontend/src/views/CommunityReports.vue`:
  - Adds an emergency modal that opens on mount (gated by
    `sessionStorage`). "Yes" navigates to `tel:000`; "No" dismisses.
  - Replaces the `Image URL` input with a file picker. Files are converted
    to a small JPEG via `<canvas>` and uploaded; the returned public URL is
    written into `form.imageUrl` so the existing submit flow is unchanged.
  - Shows an inline preview, an upload status indicator, and a Remove
    button that resets both the local preview and `form.imageUrl`.

## Operational notes

- The emergency dial uses a plain `tel:` link and works on any device with
  a tel handler. On desktop browsers without one, the user receives the
  usual "no application configured" dialog and can still choose `No` to
  return to the normal report flow.
- Thumbnail uploads are bounded server-side at 512 KB and limited to the
  three allowed MIME types. The frontend caps the source file at 8 MB to
  avoid large in-memory decode work before resize.
- Stored images are immutable (UUID URL, content-addressed by upload),
  hence the long `Cache-Control: public, max-age=31536000, immutable`.
