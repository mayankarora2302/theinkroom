# API reference

Base path: `/api/v1`. The site proxies this path to the Express API, so browsers call it on the site's own origin.

## Conventions

**Success:** `{ "data": … }`; lists also include `"meta"`.

**Error:**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Give the tattoo a title", "fields": { "title": "Give the tattoo a title" } } }
```

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Invalid input (`fields` maps each field to a message) |
| 401 | `UNAUTHENTICATED` | Missing, expired or invalid session; wrong credentials |
| 403 | `CSRF_INVALID` | Missing or wrong `X-CSRF-Token`, or a foreign `Origin` |
| 404 | `NOT_FOUND` | Unknown or unpublished item |
| 409 | `CONFLICT` | Homepage carousel already full |
| 413 | `PAYLOAD_TOO_LARGE` | Photo larger than `MAX_UPLOAD_MB` |
| 415 / 422 | `UNSUPPORTED_MEDIA_TYPE` | Not JPEG/PNG/WebP, not a real image, or over the pixel limit (decompression-bomb guard). Any normal size is accepted; small photos are never enlarged. |
| 429 | `RATE_LIMITED` | Too many requests |
| 502 | `STORAGE_ERROR` | Supabase Storage rejected the upload |

**Tattoo object (public):**

```json
{
  "id": "uuid", "slug": "peony-and-moth", "title": "Peony and moth", "description": "…",
  "size": "SMALL | MEDIUM | LARGE", "estimatedPrice": 12000, "style": "Fine line", "placement": "Forearm",
  "image": { "url": "…-full.webp", "thumbUrl": "…-thumb.webp", "width": 1920, "height": 2400, "alt": "…", "blurDataUrl": "data:image/webp;base64,…" },
  "createdAt": "2026-11-17T10:00:00.000Z"
}
```

`estimatedPrice` is whole rupees, or `null` when no price is set. The admin version adds `imageAlt`, `isPublished`,
`isFeatured`, `featuredOrder` and `updatedAt`.

## Public endpoints

Public endpoints need no authentication. They are rate limited and cacheable for 30 seconds.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | `{ ok: true }` |
| GET | `/public/tattoos` | Published work only. Query: `page` (default 1), `limit` (1–48, default 12), `size` (`small`/`medium`/`large`), `q` (searches title, style, placement), `sort` (`newest`/`oldest`), `exclude` (a slug). `meta` = `{ page, limit, total, totalPages, hasMore, counts: { ALL, SMALL, MEDIUM, LARGE } }` |
| GET | `/public/tattoos/:slug` | `{ tattoo, previous, next, related[] }`; 404 if missing or unpublished |
| GET | `/public/featured` | Featured **and** published work, in the saved order, capped at the carousel limit |
| GET | `/public/slugs` | `{ slug, updatedAt }[]` for the sitemap |
| GET | `/public/settings` | Artist and contact information (no admin-only fields) |
| POST | `/public/enquiries` | JSON `{ name, phone, email?, idea, preferredSize? (SMALL/MEDIUM/LARGE/UNSURE), placement?, contactMethod (WHATSAPP/PHONE/EMAIL), tattooSlug? }`. Email is required when `contactMethod` is `EMAIL`. Limited to 6 per hour per IP and 60 per hour site-wide. |

## Admin authentication

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/admin/auth/login` | `{ username, password }`, where `username` may also be the email (`{ email, password }` is still accepted). Sets the session cookie and returns `{ user, csrfToken, expiresAt }`. Limits: 8 failures per 15 min per IP, and 10 failures per 15 min per account. |
| POST | `/admin/auth/logout` | Deletes the session server-side and clears the cookie |
| GET | `/admin/auth/me` | `{ user, csrfToken, expiresAt }`; the client calls this on load to get its CSRF token |

Every route below requires the session cookie. Every non-GET request also requires the
`X-CSRF-Token: <csrfToken>` header. Responses are sent with `Cache-Control: no-store`.

## Admin portfolio

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/stats` | `{ total, published, unpublished, featured, featuredLimit, newEnquiries }` |
| GET | `/admin/tattoos` | Query: `page`, `limit` (≤100), `status` (`all`/`published`/`draft`), `size`, `featured` (`true`/`false`), `q` |
| GET | `/admin/tattoos/:id` | One tattoo, including drafts |
| POST | `/admin/tattoos` | `multipart/form-data`: `image` (required file) plus `title`, `size`, and optionally `description`, `estimatedPrice`, `style`, `placement`, `imageAlt`, `isPublished`, `isFeatured`. Returns 201. |
| PUT | `/admin/tattoos/:id` | Same multipart fields, all optional; only the fields you send change. Sending `image` replaces the photo, and the old files are deleted after the database update succeeds. The slug never changes. Unpublishing also removes the tattoo from the carousel. |
| DELETE | `/admin/tattoos/:id` | Deletes the record and its files. Returns 204. |
| PATCH | `/admin/tattoos/:id/featured` | `{ isFeatured: boolean }`. Adds to the end of the carousel or removes it. Returns 400 for drafts, 409 when the carousel is full. |
| PUT | `/admin/featured/reorder` | `{ ids: uuid[] }` **replaces** the carousel selection with exactly these published tattoos, in this order, in one transaction |

## Admin settings and enquiries

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/settings` | All settings, including `featuredLimit` |
| PUT | `/admin/settings` | The full settings object. A WhatsApp number is normalised to digits; an Instagram `@handle` becomes a profile URL. `processSteps` allows at most 8 entries, `faqs` at most 20, and `featuredLimit` is 1–12. |
| PUT | `/admin/settings/portrait` | Multipart `image` plus optional `portraitAlt` |
| DELETE | `/admin/settings/portrait` | Removes the portrait |
| GET | `/admin/enquiries` | Query: `status` (`NEW`/`HANDLED`) |
| PATCH | `/admin/enquiries/:id` | `{ status: "NEW" \| "HANDLED" }` |
| DELETE | `/admin/enquiries/:id` | Returns 204 |

## Site revalidation (Next.js)

`POST /api/revalidate` lives on the **site**, not the API. The API calls it after every content change with the header
`x-revalidate-secret: $REVALIDATE_SECRET` and the body `{ tags: ["tattoos" | "featured" | "settings"] }`, so public
pages show the change on the next request. If it is unreachable, pages still refresh within 2 minutes.
