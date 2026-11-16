# Security review

**Date:** 17 November 2026 · **Scope:** the Next.js site, the Express API, Prisma/PostgreSQL and image uploads.
**Environment:** local development (PostgreSQL, local storage driver), plus the API built and run with `NODE_ENV=production`.
**Method:** an automated attack script (`npm run test:security`, 51 checks) against the running site and API, both
through the public site proxy and directly; Playwright browser tests; backend integration tests; code review; and
`npm audit`.

## Result

**51 of 51 attack checks pass** after the fixes below. 29 backend tests and 14 browser tests also pass, including an
automated WCAG 2.2 AA accessibility scan.

## Findings and fixes

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | **Login rate limit bypassable.** Next.js passes a client-supplied `X-Forwarded-For` straight through to the API, so changing that header on every attempt gave unlimited password guesses, through the site or directly. | High | **Fixed.** Added a per-account limit (10 failed attempts per 15 min, keyed on the username being tried) that doesn't depend on IP. Covered by a regression test. |
| 2 | **Enquiry spam limit bypassable** the same way. | Low | **Fixed.** Added a site-wide cap of 60 enquiries per hour alongside the per-IP limit. |
| 3 | **Photos over 10 MB broke uploads.** Because the site has a `proxy.ts`, Next.js buffered every request body and silently cut it off at 10 MB, so the API received a truncated file and hung. Real phone photos are often bigger. | Medium (availability) | **Fixed.** Raised `proxyClientMaxBodySize` to the upload limit plus 5 MB; the API still enforces 15 MB with a clear 413. Covered by a 12 MB end-to-end test. |
| 4 | `zod` < 4.6.6: memory exhaustion validating huge arrays (GHSA-mrhx-c7xc-m3w5). Only reachable on signed-in admin endpoints, with bodies capped at 200 KB. | Low in practice | **Fixed.** Upgraded to zod 4.6.7. |
| 5 | `tinypool` (critical) and `@vitest/mocker` (moderate) in the test runner. Dev machines only, never deployed. | Dev-only | **Fixed.** Upgraded to Vitest 4.1.12. |
| 6 | A production install (`npm ci --omit=dev`) would fail: the backend's `postinstall` needs the Prisma CLI, which was a dev dependency. Production also needs it for `db:deploy`. | Deployment | **Fixed.** Moved `prisma` to dependencies. |
| 7 | The login page's `?next=` redirect accepted `/admin/../../x` (still same-site, so harmless). | Informational | **Hardened.** The URL is resolved, and only same-origin `/admin` paths are allowed. |
| 8 | No HSTS header on the site in production. | Low | **Fixed.** `Strict-Transport-Security` and `Cross-Origin-Opener-Policy` are added in production. |
| 9 | `deepmerge-ts` < 8 via the Prisma **CLI** config loader (GHSA-ggr8-5vv4-36mx). The Prisma client the API runs on doesn't use it, so site visitors can't reach it. | Low | **Accepted.** The only fix is a breaking Prisma 6 → 7 upgrade; recommended as a follow-up. |

## What was tested and holds

**Authentication and sessions**
- All 17 admin endpoints return 401 without a session, both through the site and directly; forged tokens are rejected.
- Passwords are stored as Argon2id hashes, never returned; there is no registration endpoint and no default account.
- Unknown usernames and wrong passwords get identical messages and timing (about 18 ms each), so accounts can't be discovered.
- Each login issues a fresh token (no session fixation). Logout and expiry invalidate the session server-side, so a
  copied cookie stops working.
- Cookie in development: `HttpOnly; SameSite=Lax`, with an expiry. In production (verified with the built server):
  `__Host-` prefix, `Secure; HttpOnly; SameSite=Lax`, plus HSTS.
- The `?next=` redirect after login can't send users off-site (`//evil`, `https://evil`, `/\evil`, `javascript:`).

**CSRF and CORS**
- Mutations need a per-session CSRF token; a missing token or another session's token gets 403.
- A foreign `Origin` gets 403, including on login (login CSRF).
- CORS allows only the site's own origin.

**Injection and XSS**
- SQL-injection strings in search and slugs are treated as text (Prisma parameterises every query).
- HTML and script in titles, descriptions, placements and enquiries are rendered escaped; JSON-LD can't be broken out of.
- `javascript:` and non-Instagram URLs are rejected in settings; WhatsApp, phone and email links are built from
  validated values.
- Protected fields (`slug`, `imagePath`, `id`, `createdAt`) can't be set through the API (no mass assignment).

**Uploads**
- Rejected: an SVG with script renamed `.png`, HTML renamed `.jpg`, a real GIF labelled JPEG, PHP files, and files
  over 15 MB.
- A decompression bomb (186 KB file that decodes to 196 megapixels) is refused in 7 ms without being decoded.
- Every image is re-encoded to WebP (stripping metadata and any embedded payloads). Uploaded filenames are never used
  in storage paths, and path traversal on `/media` leaks nothing.

**Data exposure**
- Drafts never appear in public lists, slugs, the sitemap or their own URL (404).
- Public responses carry no admin fields; admin responses are `Cache-Control: no-store`.
- Errors return a fixed JSON shape with no stack traces, in development and production mode.
- The revalidation webhook requires its secret.

**Headers:** site — `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, `nosniff`, Referrer-Policy, no
`X-Powered-By`, and `X-Robots-Tag: noindex` on `/admin`. API — Helmet (strict CSP, HSTS, `nosniff`).

## Recommendations before going live

1. **Use a strong admin password on the live site.** The current password meets the 12-character minimum but is a
   familiar phrase. Per-account limiting allows at most about 960 guesses a day, but a long, unusual passphrase
   removes the risk entirely. Reset it with
   `npm run admin:create -- --username <name> --reset`.
2. Put the site behind a load balancer or CDN that appends the client IP, set `TRUST_PROXY` to match, and keep the
   API on a private network (see the README's deployment notes).
3. Upgrade Prisma to version 7 when convenient, which clears finding 9.
4. Re-run `npm run test:security`, `npm test` and `npm run test:e2e` after changes; they are designed to be repeatable.
5. Note the trade-off in per-account limiting: someone who knows the username can deliberately trigger a 15-minute
   sign-in pause. It never exposes the account, and it resets on its own.
