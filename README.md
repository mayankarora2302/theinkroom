# The Ink Room — tattoo artist portfolio & CMS

A portfolio website for an independent tattoo artist, with a private admin area the artist uses to
manage photographs, the homepage carousel, website text and enquiries.

```
frontend/   Next.js 16 (App Router, React 19, Tailwind CSS 4) — public site + /admin
backend/    Express 5 + TypeScript REST API — auth, validation, uploads, business logic
  prisma/   Prisma schema + migrations (Supabase PostgreSQL)
e2e/        Playwright end-to-end tests
docs/       API reference and the artist's admin guide
```

- **Database:** Supabase PostgreSQL through Prisma. Only metadata and storage paths are stored; no image binaries.
- **Images:** uploaded to the Express API, validated and re-encoded with Sharp into WebP (2400px display, 1000px
  thumbnail, blur placeholder), then stored in a **Supabase Storage** bucket. The service-role key never leaves the server.
- **Browser ↔ API:** the browser only talks to the site's own origin. Next.js proxies `/api/v1/*` to Express, so the
  admin session cookie is first-party, `HttpOnly` and `SameSite=Lax`.

More detail: [API reference](docs/API.md) · [Admin guide for the artist](docs/ADMIN-GUIDE.md) · [Security review](docs/SECURITY-REVIEW.md)

---

## 1. Requirements

- Node.js 20.9 or newer (developed on Node 25)
- A Supabase project (free tier is fine)
- Google Chrome, only to run the end-to-end tests

## 2. Set up Supabase

1. Create a project at supabase.com.
2. **Project Settings → Database → Connection string**:
   - *Transaction pooler* (port **6543**) → `DATABASE_URL`, adding `?pgbouncer=true&connection_limit=5`
   - *Session pooler / direct* (port **5432**) → `DIRECT_URL`
3. **Project Settings → API**: copy the **Project URL** (`SUPABASE_URL`) and the **service_role** secret
   (`SUPABASE_SERVICE_ROLE_KEY`). Keep the service-role key server-side only.
4. You don't need to create the storage bucket. On startup the API checks for `SUPABASE_STORAGE_BUCKET`
   (default `portfolio`) and creates it as a **public-read** bucket that accepts WebP only. Uploads and deletes
   still go through the authenticated API.

## 3. Configure environment

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env.local
```

Fill both in. Generate one random value and use it as `REVALIDATE_SECRET` in **both** files:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Set `MEDIA_ORIGIN` in the frontend to your `SUPABASE_URL`. The root [.env.example](.env.example) lists every variable in one place.

## 4. Install, migrate, create the admin

```bash
npm install
```

```bash
npm run db:deploy
```

Migrations live in `backend/prisma/migrations`. Use `npm run db:deploy` for an existing database (it applies pending
migrations only). When you change `schema.prisma` during development, run `npm run db:migrate` to create a new
migration. Don't edit tables by hand.

Create the artist's admin account. They sign in with the username (or the email, if you add one). You'll be prompted
for a password; it's hidden as you type, needs at least 12 characters, and is stored as an Argon2id hash. For the live
site, choose a long, unusual passphrase rather than a familiar phrase.

```bash
npm run admin:create -- --username theartist --email artist@example.com
```

- `--email` is optional; usernames are 3–40 lowercase letters, numbers, dots, underscores or hyphens.
- Reset a forgotten password (this also signs out every session): `npm run admin:create -- --username theartist --reset`
- A second admin requires `--additional`, so extra accounts are never created by accident.
- For automated setups, pass the password through the `ADMIN_PASSWORD` environment variable instead of the prompt.
- There is no public registration and no default account. This command is the only way to create an admin.

## 5. Run locally

```bash
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin
- API: http://localhost:4000/api/v1/health

On first start the site shows its empty states: a typographic hero, "the portfolio is being prepared", and neutral
default process/FAQ copy for the artist to review. Sign in to `/admin` and upload work.

### Optional: placeholder content for design review

```bash
npm run seed:placeholders
```

This creates 10 clearly labelled grey placeholder entries ("Placeholder 01 — replace with real photograph"), five of
them featured, so the layout can be reviewed before real photography exists. Remove them all with:

```bash
npm run seed:placeholders -- --clear
```

### Offline development without Supabase

Set `STORAGE_DRIVER=local` in `backend/.env` and `IMAGES_ALLOW_LOCAL=1` in `frontend/.env.local`. Uploads are then
written to `backend/uploads/` and served by the API at `/media`. This driver refuses to start when
`NODE_ENV=production`. You still need a PostgreSQL database for `DATABASE_URL`.

## 6. Checks and tests

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript for both apps |
| `npm run lint` | ESLint for both apps |
| `npm run build` | Production build of both apps |
| `npm test` | Backend API tests (Vitest + Supertest), 29 tests |
| `npm run test:e2e` | Playwright end-to-end tests against the running dev site |
| `npm run test:security` | 51 attack checks against the running dev site (auth, CSRF, uploads, XSS, injection, headers) — see [the security review](docs/SECURITY-REVIEW.md) |

**Backend tests** need a separate, disposable PostgreSQL database. Migrations are applied automatically, and rows are
deleted between tests:

```bash
TEST_DATABASE_URL="postgresql://…/inkroom_test" npm test
```

They cover login by username or email, logout, per-account brute-force limiting (including forged `X-Forwarded-For`),
unauthenticated access, CSRF and origin checks, upload validation (wrong type, fake
image, too small, too large), WebP optimisation, slug uniqueness, edits that keep unsent fields, image replacement and
deletion, published/draft visibility, size filtering and pagination, featured ordering and limits, settings
validation, and enquiries (including the honeypot).

**End-to-end tests** run in your installed Chrome against `npm run dev`. Copy `e2e/.env.e2e.example` to
`e2e/.env.e2e`; the suite creates or resets that test admin in your **local** database, then cleans up the tattoos and
enquiries it creates:

```bash
npm run test:e2e
```

They cover browsing, size filters, detail pages and 404s, the enquiry form, robots/sitemap, an automated WCAG 2.2 AA
scan (axe) of the public pages, the admin redirect, a wrong password, the full upload → publish → edit → feature →
unpublish → delete flow, a 12 MB photo upload through the site proxy, non-image rejection, sign-out, and on a phone
viewport the mobile menu (focus and Escape) plus a check for horizontal overflow. 14 tests.

## 7. Security summary

- Passwords are hashed with Argon2id (OWASP parameters). There is no registration endpoint and no default credentials.
- Sessions are opaque random tokens; only a SHA-256 of each token is stored. The cookie is HTTP-only, `Secure` and
  `__Host-` prefixed in production, `SameSite=Lax`, with server-side expiry and logout.
- CSRF protection: a per-session synchroniser token (`X-CSRF-Token`) is required on every admin mutation, plus an
  `Origin` check.
- Login is rate limited per IP (8 failures / 15 min) **and per account** (10 failures / 15 min). The per-account limit
  can't be dodged by forging `X-Forwarded-For`. Enquiries have per-IP and site-wide caps; public reads are limited too.
- Helmet headers and strict CORS (one allowed origin) on the API; `X-Frame-Options`, a CSP `frame-ancestors`
  directive, a Referrer-Policy and `noindex` headers on `/admin` for the site.
- Every input is validated with Zod on the server. Uploads are checked by MIME type, size and actual decoded content
  (Sharp); a renamed text file is rejected.
- Public endpoints only ever return published work, never admin fields. Admin responses are `Cache-Control: no-store`.
- Errors return a consistent JSON shape with no stack traces; details are only logged on the server.

## 8. Deployment notes

The app isn't tied to a host. You need two Node processes (or one container each):

- `backend`: `npm run build -w backend`, then `npm run start -w backend`
- `frontend`: `npm run build -w frontend`, then `npm run start -w frontend`

Set `NODE_ENV=production`, use HTTPS, point `FRONTEND_ORIGIN`, `NEXT_PUBLIC_SITE_URL` and `FRONTEND_REVALIDATE_URL`
at the real domain, and run `npm run db:deploy` on each release.

- Keep the API on a private network: only the Next.js site should be able to reach it.
- Put a load balancer or CDN in front of the site that **appends** the client IP to `X-Forwarded-For`, and set
  `TRUST_PROXY` to the number of proxies between the internet and the API (Next.js counts as one). Next.js forwards a
  client-supplied `X-Forwarded-For` unchanged, so per-IP limits are only meaningful behind such a proxy. Per-account
  login limits work either way.
- If you change `MAX_UPLOAD_MB`, set `NEXT_PUBLIC_MAX_UPLOAD_MB` to the same value: the site uses it for its proxy
  body limit (see `next.config.ts`) and for the upload form's own check.
# theinkroom
# theinkroom
