# Community Report Image Cross-Origin Fix (2026-05-04)

## Summary

- Fixed community report thumbnail loading from the public frontend domain.
- Backend image responses now allow cross-origin embedding by setting:

```http
Cross-Origin-Resource-Policy: cross-origin
```

## Why

Community report map popups loaded thumbnails from the Railway backend domain while the page ran on `https://www.gohiking.me`. The backend already returned CORS headers, but Helmet also emitted:

```http
Cross-Origin-Resource-Policy: same-origin
```

That blocked `<img>` loading in the browser with:

```text
net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
```

## Changes

- Configured Helmet with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.
- Explicitly sets `Cross-Origin-Resource-Policy: cross-origin` on `GET /api/community-reports/images/:id`.

## Notes

- No API route changed.
- Uploaded thumbnails remain immutable and cached.
- This only affects browser embedding permissions for public report thumbnails.
