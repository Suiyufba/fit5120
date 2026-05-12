# Security Best Practices Report

Date: 2026-05-12

## Executive Summary

The project already has several good security controls: Helmet is enabled on the backend, CORS uses an explicit allowlist, JSON body sizes are capped, SQL access is mostly parameterized, auth write endpoints are rate limited, and required production secrets such as `AUTH_JWT_SECRET` and `OPENROUTESERVICE_API_KEY` are validated at startup.

The main remaining risks are production-hardening gaps rather than obvious direct code execution bugs. The highest priority issues are: the AI service can run unauthenticated when `AI_SERVICE_AUTH_TOKEN` is unset, expensive public route/report endpoints lack abuse controls, and backend URL generation trusts request host/proxy headers.

## Remediation Status

Updated 2026-05-13: the findings in this report have been remediated in the working tree. Notable changes include mandatory AI service auth outside tests, rate limits on expensive public writes, mandatory `PUBLIC_API_ORIGIN` outside tests, HttpOnly cookie auth instead of browser-stored JWTs, URL allowlisting for knowledge article links/images, explicit knowledge table configuration, and dependency updates that bring `npm audit --omit=dev` to zero known vulnerabilities.

## High Severity

### H-1: AI narration service authentication is optional

- Rule ID: EXPRESS-INPUT-001 / API authentication hardening
- Location: `ai-service/src/server.js:9`, `ai-service/src/server.js:17-24`; backend caller config at `backend/src/config/index.ts:101-102`
- Evidence:
  ```js
  const authToken = String(process.env.AI_SERVICE_AUTH_TOKEN || '').trim();
  ...
  if (authToken) {
    const provided = String(req.header('x-ai-service-token') || '').trim();
    if (!provided || provided !== authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  ```
- Impact: If the AI service is exposed publicly or accidentally reachable from the internet with `AI_SERVICE_AUTH_TOKEN` unset, anyone can call `/v1/route-introduction`, consume Gemini quota/cost, and use the service as an unauthenticated API.
- Fix: In production, require `AI_SERVICE_AUTH_TOKEN` to be present and reject startup if missing. Compare tokens with a constant-time comparison. Keep unauthenticated mode only for explicit local/test environments.
- Mitigation: Restrict the AI service at network level so only the backend can reach it.

### H-2: Expensive public APIs are not rate limited

- Rule ID: EXPRESS-RATE-001 / abuse controls
- Location: `backend/src/routes/routePlannerRoutes.ts:12`; `backend/src/routes/communityReportsRoutes.ts:12-13`; auth limiter exists only at `backend/src/routes/authRoutes.ts:15-28`
- Evidence:
  ```ts
  routePlannerRoutes.post('/routes/plan', optionalAuth, postPlanRoute);
  communityReportsRoutes.post('/community-reports', postCommunityReport);
  communityReportsRoutes.post('/community-reports/images', postCommunityReportImage);
  ```
- Impact: Anonymous users can repeatedly trigger route planning, external API calls, route narration, database writes, and image uploads. This creates denial-of-service and third-party API cost risk.
- Fix: Add route-specific rate limiters, with stricter limits for anonymous users and cost-heavy endpoints. Consider per-user limits for authenticated users and per-session limits for `X-Plan-Session-Id`.
- Mitigation: Add platform-level WAF/rate limiting and monitoring alerts for spikes in `/api/routes/plan` and report image uploads.

## Medium Severity

### M-1: Host/proxy headers are trusted when generating redirects and public image URLs

- Rule ID: EXPRESS-REDIRECT-001 / host header validation
- Location: `backend/src/server.ts:59-64`, duplicated in `backend/src/config/appFactory.ts:51-56`; image URL generation at `backend/src/controllers/communityReportsController.ts:46-49`
- Evidence:
  ```ts
  const host = req.headers.host;
  res.redirect(301, `https://${host}${req.originalUrl}`);
  ```
  ```ts
  const proto = req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/api/community-reports/images/${imageId}`;
  ```
- Impact: If the deployment/proxy does not strictly normalize `Host` and `X-Forwarded-*` headers, attackers can produce redirects or returned image URLs containing an attacker-controlled host. This can enable phishing links, cache poisoning, or confusing user-visible URLs.
- Fix: Use a configured canonical public origin, for example `PUBLIC_API_ORIGIN`, when constructing absolute URLs and redirects. Reject unexpected hosts early against an allowlist.
- Mitigation: Ensure Railway/Vercel/proxy config overwrites forwarded headers and only permits known hostnames.

### M-2: Preview access password is shipped to every browser

- Rule ID: VUE-SECRETS-001 / frontend trust model
- Location: `frontend/src/App.vue:5`, `frontend/src/App.vue:21-31`
- Evidence:
  ```js
  const ACCESS_PASSWORD = import.meta.env.VITE_SITE_ACCESS_PASSWORD || 'gkd'
  ...
  localStorage.setItem(ACCESS_STORAGE_KEY, 'true')
  ```
- Impact: `VITE_*` variables are bundled into client JavaScript, and the fallback password is hard-coded. Anyone can inspect the bundle or set localStorage to bypass this gate. This is fine only as a visual preview gate, not as access control.
- Fix: If this gate protects private content, move it to server/edge middleware or the backend. Remove the hard-coded fallback and fail closed when the variable is missing.
- Mitigation: Document it as non-security UX only if it is intentionally just a preview affordance.

### M-3: JWT access tokens are stored in `sessionStorage`

- Rule ID: VUE-AUTH-001 / browser token storage
- Location: `frontend/src/services/authStore.ts:12`, `frontend/src/services/authStore.ts:20-22`, `frontend/src/services/authStore.ts:41-48`
- Evidence:
  ```ts
  const SESSION_TOKEN_KEY = 'hikeshield_auth_token'
  token: sessionStorage.getItem(SESSION_TOKEN_KEY) || '',
  sessionStorage.setItem(SESSION_TOKEN_KEY, state.token)
  ```
- Impact: Any successful XSS on the frontend can read the bearer token and impersonate the user until expiry. The current XSS search found no obvious unescaped user-data HTML sink, but token storage keeps the blast radius high.
- Fix: Prefer HttpOnly, Secure, SameSite cookies for sessions and add CSRF protection for state-changing cookie-authenticated requests. If bearer tokens remain, shorten expiry and consider refresh-token rotation handled server-side.
- Mitigation: Keep CSP strict, avoid `v-html`/raw DOM sinks, and monitor suspicious auth use.

### M-4: Article `href` and image URLs are passed from database to DOM without URL scheme allowlisting

- Rule ID: VUE-URL-001 / unsafe URL binding
- Location: backend mapping at `backend/src/modules/knowledge/repositories/articleRepository.ts:139-150`; frontend bindings at `frontend/src/views/KnowledgeHub.vue:105-109` and `frontend/src/views/KnowledgeHub.vue:131-135`
- Evidence:
  ```js
  sourceUrl: pickString(row.source_url || row.reference_url || row.link),
  imageUrl: pickString(row.image_url || row.imageurl || row.cover_image || row.thumbnail_url || row.image),
  ```
  ```vue
  <a v-if="featuredArticle.sourceUrl" :href="featuredArticle.sourceUrl" target="_blank" rel="noreferrer">
  ```
- Impact: If article records are imported from an untrusted source or editable by a compromised/admin account, unsafe schemes such as `javascript:` or unexpected protocols can become user-clickable links. Image URLs can also be used for unwanted third-party tracking.
- Fix: Normalize URLs on the backend and only allow `https:` for external links/images, plus any explicitly required first-party relative paths.
- Mitigation: Add a frontend helper that renders links only after `new URL()` validation.

## Low Severity / Defense In Depth

### L-1: Dynamic knowledge table discovery can expose unintended article-like tables

- Rule ID: EXPRESS-INPUT-001 / data exposure minimization
- Location: `backend/src/modules/knowledge/repositories/articleRepository.ts:154-227`
- Evidence:
  ```js
  const result = await pool.query(`SELECT * FROM ${safeTableIdentifier} LIMIT 200`);
  ```
- Impact: Identifier validation prevents SQL injection, but auto-discovering any table with title/content/image-like columns can expose rows from an unintended table if the database contains multiple candidate schemas.
- Fix: Prefer a fixed table name from config or a strict allowlist with explicit operator choice.
- Mitigation: Keep DB roles least-privileged so the app cannot read unrelated tables.

## Dependency Audit

`npm audit --omit=dev --json` found 3 moderate issues at workspace level:

- `express-rate-limit` via `ip-address` (`GHSA-v2v4-37r5-5v8g`), fix available.
- `ip-address <=10.1.0`, transitive through `express-rate-limit`, fix available.
- `postcss <8.5.10` (`GHSA-qx2v-qp2m-jg93`), fix available.

Recommended action: run dependency updates in the affected workspaces and re-run `npm audit --omit=dev`.

## Positive Findings

- Backend CORS rejects wildcard production origins.
- Backend uses `helmet()` with CSP, frame blocking, `object-src 'none'`, and referrer policy.
- Auth endpoints use `express-rate-limit`.
- Password policy requires at least 12 chars with mixed character classes.
- SQL queries reviewed in core repositories are parameterized, with only table identifiers dynamically interpolated after a strict identifier regex.
- Frontend XSS sink search did not find obvious unescaped user-controlled `v-html` usage. The Mapbox popup HTML uses explicit escaping for hazard fields.
