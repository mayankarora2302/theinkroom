// Security probe for The Ink Room. Run against a LOCAL dev setup only (`npm run dev`):
//   npm run test:security
// It signs in as the e2e test admin (e2e/.env.e2e), attacks the site + API, prints PASS/FAIL lines,
// and deletes everything it created. Exit code is non-zero if any check fails.
import fs from 'node:fs';
import sharp from 'sharp';
import zlib from 'node:zlib';

const SITE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const env = Object.fromEntries(
  fs.readFileSync(new URL('./.env.e2e', import.meta.url), 'utf8').split('\n').filter((l) => /^[A-Z]/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);

async function login(base = SITE, headers = {}) {
  const r = await fetch(`${base}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: SITE, ...headers },
    body: JSON.stringify({ username: env.E2E_ADMIN_EMAIL, password: env.E2E_ADMIN_PASSWORD }),
  });
  const body = await r.json();
  const cookie = (r.headers.getSetCookie?.() ?? [])[0] ?? '';
  return { status: r.status, cookie: cookie.split(';')[0], rawCookie: cookie, csrf: body?.data?.csrfToken };
}
const authed = (s, extra = {}) => ({ cookie: s.cookie, 'x-csrf-token': s.csrf, origin: SITE, ...extra });

// ── 1. Authentication & access control ─────────────────────────────────
const adminRoutes = [
  ['GET', '/admin/auth/me'], ['POST', '/admin/auth/logout'], ['GET', '/admin/stats'], ['GET', '/admin/tattoos'],
  ['POST', '/admin/tattoos'], ['GET', '/admin/tattoos/00000000-0000-0000-0000-000000000000'],
  ['PUT', '/admin/tattoos/00000000-0000-0000-0000-000000000000'], ['DELETE', '/admin/tattoos/00000000-0000-0000-0000-000000000000'],
  ['PATCH', '/admin/tattoos/00000000-0000-0000-0000-000000000000/featured'], ['PUT', '/admin/featured/reorder'],
  ['GET', '/admin/settings'], ['PUT', '/admin/settings'], ['PUT', '/admin/settings/portrait'], ['DELETE', '/admin/settings/portrait'],
  ['GET', '/admin/enquiries'], ['PATCH', '/admin/enquiries/00000000-0000-0000-0000-000000000000'], ['DELETE', '/admin/enquiries/00000000-0000-0000-0000-000000000000'],
];
let unauthOk = true;
for (const [m, p] of adminRoutes) {
  for (const base of [SITE, API]) {
    const r = await fetch(`${base}/api/v1${p}`, { method: m, headers: { 'content-type': 'application/json', origin: SITE }, body: m === 'GET' ? undefined : '{}' });
    if (r.status !== 401) {
      unauthOk = false;
      console.log(`   ${m} ${base}${p} → ${r.status}`);
    }
  }
}
check('All 17 admin endpoints return 401 without a session (via proxy and direct)', unauthOk);

const forged = await fetch(`${API}/api/v1/admin/stats`, { headers: { cookie: 'ir_session=' + 'A'.repeat(43) } });
check('Forged session token rejected', forged.status === 401);

const s1 = await login();
check('Valid login succeeds', s1.status === 200 && !!s1.csrf);
check('Session cookie is HttpOnly', /HttpOnly/i.test(s1.rawCookie), s1.rawCookie.replace(/=[^;]+/, '=<redacted>'));
check('Session cookie is SameSite=Lax/Strict', /SameSite=(Lax|Strict)/i.test(s1.rawCookie));
check('Session cookie has an expiry', /Expires=/i.test(s1.rawCookie));
info('Session cookie Secure flag', /Secure/i.test(s1.rawCookie) ? 'set' : 'not set in development (set automatically when NODE_ENV=production, with the __Host- prefix)');

const s2 = await login();
check('Each login issues a fresh session token (no fixation)', s1.cookie !== s2.cookie);

const me = await (await fetch(`${SITE}/api/v1/admin/auth/me`, { headers: { cookie: s1.cookie } })).text();
check('No password hash in any auth response', !/argon2|passwordHash/.test(me));

const wrongUser = await fetch(`${API}/api/v1/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'nobody-here', password: 'x' }) });
const wrongPass = await fetch(`${API}/api/v1/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: env.E2E_ADMIN_EMAIL, password: 'x' }) });
const [wu, wp] = [await wrongUser.json(), await wrongPass.json()];
check('Unknown user and wrong password give identical errors (no enumeration)', wrongUser.status === wrongPass.status && wu.error.message === wp.error.message);
async function timeLogin(username) {
  const t = performance.now();
  await fetch(`${API}/api/v1/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify({ username, password: 'wrong-password' }) });
  return performance.now() - t;
}
const tu = [], tk = [];
for (let i = 0; i < 4; i++) { tu.push(await timeLogin('nobody-here')); tk.push(await timeLogin(env.E2E_ADMIN_EMAIL)); }
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
check('Login timing similar for unknown vs known user', Math.abs(avg(tu) - avg(tk)) < 40, `unknown ${avg(tu).toFixed(0)}ms vs known ${avg(tk).toFixed(0)}ms`);

// ── 2. CSRF ───────────────────────────────────────────────────────────
const noToken = await fetch(`${SITE}/api/v1/admin/featured/reorder`, { method: 'PUT', headers: { cookie: s1.cookie, 'content-type': 'application/json', origin: SITE }, body: '{"ids":[]}' });
check('Mutation without CSRF token rejected (403)', noToken.status === 403);
const crossToken = await fetch(`${SITE}/api/v1/admin/featured/reorder`, { method: 'PUT', headers: { ...authed(s1), 'x-csrf-token': s2.csrf, 'content-type': 'application/json' }, body: '{"ids":[]}' });
check("Another session's CSRF token rejected", crossToken.status === 403);
const evilOrigin = await fetch(`${SITE}/api/v1/admin/featured/reorder`, { method: 'PUT', headers: { ...authed(s1), origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"ids":[]}' });
check('Mutation from foreign Origin rejected', evilOrigin.status === 403);
const evilLogin = await fetch(`${SITE}/api/v1/admin/auth/login`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ username: env.E2E_ADMIN_EMAIL, password: env.E2E_ADMIN_PASSWORD }) });
check('Login CSRF from foreign Origin rejected', evilLogin.status === 403);
const formPost = await fetch(`${SITE}/api/v1/admin/featured/reorder`, { method: 'PUT', headers: { cookie: s1.cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'ids=' });
check('Simple form-encoded cross-site style request rejected', formPost.status === 403);

// ── 3. CORS ───────────────────────────────────────────────────────────
const pre = await fetch(`${API}/api/v1/admin/tattoos`, { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'DELETE' } });
const acao = pre.headers.get('access-control-allow-origin');
check('CORS does not allow foreign origins', !acao || acao === SITE, `ACAO=${acao}`);

// ── 4. Input validation & injection ──────────────────────────────────
const sqli = await fetch(`${SITE}/api/v1/public/tattoos?q=${encodeURIComponent("' OR 1=1 --")}`);
const sqliBody = await sqli.json();
check('SQL-injection string in search is treated as text', sqli.status === 200 && sqliBody.data.length === 0);
const sqliSlug = await fetch(`${SITE}/api/v1/public/tattoos/${encodeURIComponent("x' OR '1'='1")}`);
check('SQL-injection string in slug returns 404', sqliSlug.status === 404);
const badUuid = await fetch(`${SITE}/api/v1/admin/tattoos/not-a-uuid`, { headers: authed(s1) });
check('Malformed id gives 400, not 500', badUuid.status === 400);
const badJson = await fetch(`${SITE}/api/v1/public/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE }, body: '{"name":' });
const badJsonText = await badJson.text();
check('Malformed JSON gives 400 without a stack trace', badJson.status === 400 && !/at \w+ \(|node_modules|\.ts:\d/.test(badJsonText));
const huge = await fetch(`${API}/api/v1/public/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: 'x'.repeat(300_000) }) });
check('Oversized JSON body rejected (413)', huge.status === 413);
const limitAbuse = await fetch(`${SITE}/api/v1/public/tattoos?limit=100000`);
check('Unbounded page size rejected', limitAbuse.status === 400);
const badSettings = await fetch(`${SITE}/api/v1/admin/settings`, { headers: authed(s1) });
const settings = (await badSettings.json()).data;
const base = { ...settings, portrait: undefined, updatedAt: undefined };
const jsUrl = await fetch(`${SITE}/api/v1/admin/settings`, { method: 'PUT', headers: { ...authed(s1), 'content-type': 'application/json' }, body: JSON.stringify({ ...base, instagramUrl: 'javascript:alert(document.cookie)' }) });
check('javascript: URL rejected in Instagram setting', jsUrl.status === 400);
const evilIg = await fetch(`${SITE}/api/v1/admin/settings`, { method: 'PUT', headers: { ...authed(s1), 'content-type': 'application/json' }, body: JSON.stringify({ ...base, instagramUrl: 'https://evil.example/instagram.com/x' }) });
check('Non-Instagram URL rejected in Instagram setting', evilIg.status === 400);

// ── 5. Uploads ────────────────────────────────────────────────────────
async function upload(buf, type, name, extra = {}) {
  const fd = new FormData();
  fd.set('title', extra.title ?? 'SEC probe piece');
  fd.set('size', 'SMALL');
  fd.set('isPublished', extra.isPublished ?? 'false');
  for (const [k, v] of Object.entries(extra.fields ?? {})) fd.set(k, v);
  fd.set('image', new Blob([buf], { type }), name);
  const r = await fetch(`${SITE}/api/v1/admin/tattoos`, { method: 'POST', headers: authed(s1), body: fd });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><script>alert(1)</script><rect width="900" height="900"/></svg>');
check('SVG with script disguised as PNG rejected', (await upload(svg, 'image/png', 'x.png')).status === 422);
const html = Buffer.from('<html><script>alert(1)</script></html>');
check('HTML disguised as JPEG rejected', (await upload(html, 'image/jpeg', 'x.jpg')).status === 422);
const gif = await sharp({ create: { width: 900, height: 900, channels: 3, background: '#333' } }).gif().toBuffer();
check('Real GIF disguised as JPEG rejected', (await upload(gif, 'image/jpeg', 'x.jpg')).status === 422);
check('Declared non-image MIME rejected', (await upload(Buffer.from('hi'), 'application/x-php', 'shell.php')).status === 415);
const bomb = (() => {
  // Hand-built 14000×14000 greyscale PNG: ~200 KB on disk, ~196 MB once decoded.
  const W = 14000, H = 14000;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 0;
  const idat = zlib.deflateSync(Buffer.alloc((W + 1) * H), { level: 9 });
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
})();
let t0 = performance.now();
const bombRes = await upload(bomb, 'image/png', 'bomb.png');
check('Decompression bomb (196 MP PNG) rejected quickly', bombRes.status === 422 && performance.now() - t0 < 3000, `${(bomb.length / 1024).toFixed(0)} KB file, ${(performance.now() - t0).toFixed(0)}ms, ${bombRes.status}`);
const big = Buffer.alloc(16 * 1024 * 1024, 7);
check('16 MB upload rejected through the site proxy (413)', (await upload(big, 'image/jpeg', 'big.jpg')).status === 413);
// A large but valid photo must still work through the proxy.
const noise = await sharp(Buffer.from(Array.from({ length: 3000 * 3000 * 3 }, () => Math.floor(Math.random() * 256))), { raw: { width: 3000, height: 3000, channels: 3 } }).jpeg({ quality: 100 }).toBuffer();
t0 = performance.now();
const bigOk = await upload(noise, 'image/jpeg', 'big-valid.jpg', { title: 'SEC probe large' });
check('Large valid photo uploads through the proxy', bigOk.status === 201, `${(noise.length / 1024 / 1024).toFixed(1)} MB in ${(performance.now() - t0).toFixed(0)}ms → stored ${bigOk.body?.data?.image?.width}×${bigOk.body?.data?.image?.height} WebP`);
const evilName = await upload(await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#444' } }).jpeg().toBuffer(), 'image/jpeg', '../../../../etc/passwd.jpg', { title: 'SEC probe name' });
check('Uploaded filename never used in storage path', evilName.status === 201 && !/etc|passwd|\.\./.test(evilName.body.data.image.url), evilName.body?.data?.image?.url?.replace(/^.*\/media\//, '/media/'));

// Mass assignment: try to set protected fields
const massFd = new FormData();
for (const [k, v] of Object.entries({ title: 'Mass', slug: 'hijacked', imagePath: '../../secret', id: '11111111-1111-1111-1111-111111111111', createdAt: '2000-01-01' })) massFd.set(k, v);
const mass = await fetch(`${SITE}/api/v1/admin/tattoos/${evilName.body.data.id}`, { method: 'PUT', headers: authed(s1), body: massFd });
const massBody = (await mass.json()).data;
check('Mass assignment of slug/imagePath/id/createdAt ignored', mass.status === 200 && massBody.slug !== 'hijacked' && massBody.id === evilName.body.data.id && !massBody.image.url.includes('secret'));

// ── 6. XSS ────────────────────────────────────────────────────────────
const xssTitle = `</script><script>alert("t")</script><img src=x onerror=alert(1)>`;
const xss = await upload(await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#555' } }).jpeg().toBuffer(), 'image/jpeg', 'x.jpg', { title: xssTitle, isPublished: 'true', fields: { description: '<iframe src="javascript:alert(2)"></iframe>', placement: '"><svg onload=alert(3)>' } });
const page = await (await fetch(`${SITE}/work/${xss.body.data.slug}`)).text();
check('Stored XSS in title/description/placement is escaped on the public page', !page.includes('<script>alert("t")') && !page.includes('<img src=x onerror') && !page.includes('<iframe src="javascript') && !page.includes('<svg onload'));
check('JSON-LD cannot be broken out of with </script>', !/<\/script><script>alert/.test(page));
const enq = await fetch(`${SITE}/api/v1/public/enquiries`, { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE, 'x-forwarded-for': '10.1.1.1' }, body: JSON.stringify({ name: '<script>alert(9)</script>', phone: '+91 98765 43210', idea: '<img src=x onerror=alert(8)> a fine line piece', contactMethod: 'WHATSAPP' }) });
check('Enquiry with HTML is accepted as plain text (rendered escaped by React in admin)', enq.status === 201);

// ── 7. Data exposure ──────────────────────────────────────────────────
const draftSlug = evilName.body.data.slug;
const pubList = await (await fetch(`${SITE}/api/v1/public/tattoos?limit=48&q=SEC`)).json();
const slugs = await (await fetch(`${SITE}/api/v1/public/slugs`)).json();
const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const draftPage = await fetch(`${SITE}/work/${draftSlug}`);
check('Draft hidden from public list, slugs, sitemap and its page (404)',
  !pubList.data.some((t) => t.slug === draftSlug) && !slugs.data.some((t) => t.slug === draftSlug) && !sitemap.includes(draftSlug) && draftPage.status === 404);
check('Public tattoo objects carry no admin fields', pubList.data.every((t) => !('isPublished' in t) && !('imagePath' in t) && !('featuredOrder' in t)));
const pubSettings = await (await fetch(`${SITE}/api/v1/public/settings`)).json();
check('Public settings omit admin-only fields', !('featuredLimit' in pubSettings.data));
const adminCache = await fetch(`${SITE}/api/v1/admin/stats`, { headers: authed(s1) });
check('Admin responses are Cache-Control: no-store', adminCache.headers.get('cache-control') === 'no-store');

// ── 8. Path traversal & misc endpoints ───────────────────────────────
for (const p of ['/media/../.env', '/media/%2e%2e/.env', '/media/..%2f..%2fpackage.json', '/media/../src/app.ts']) {
  const r = await fetch(`${API}${p}`);
  const t = await r.text();
  if (/DATABASE_URL|"name":|import /.test(t)) check(`Path traversal ${p}`, false, `leaked content (${r.status})`);
}
check('Path traversal on /media does not leak files', true);
const reval = await fetch(`${SITE}/api/revalidate`, { method: 'POST', headers: { 'x-revalidate-secret': 'guess', 'content-type': 'application/json' }, body: '{"tags":["tattoos"]}' });
const revalNone = await fetch(`${SITE}/api/revalidate`, { method: 'POST', body: '{}' });
check('Revalidation webhook requires the secret', reval.status === 401 && revalNone.status === 401);
for (const m of ['TRACE', 'PROPFIND']) {
  const r = await fetch(`${API}/api/v1/public/tattoos`, { method: m }).catch(() => ({ status: 0 }));
  if (r.status === 200) check(`Method ${m} not served`, false);
}
check('Unusual HTTP methods not served', true);

// ── 9. Security headers ──────────────────────────────────────────────
const sh = (await fetch(`${SITE}/`)).headers;
check('Site: X-Frame-Options DENY', sh.get('x-frame-options') === 'DENY');
check("Site: CSP frame-ancestors 'none'", /frame-ancestors 'none'/.test(sh.get('content-security-policy') ?? ''));
check('Site: X-Content-Type-Options nosniff', sh.get('x-content-type-options') === 'nosniff');
check('Site: Referrer-Policy set', !!sh.get('referrer-policy'));
check('Site: no X-Powered-By', !sh.get('x-powered-by'));
const ah = (await fetch(`${SITE}/admin/login`)).headers;
check('Admin pages send X-Robots-Tag noindex', /noindex/.test(ah.get('x-robots-tag') ?? ''));
const apiH = (await fetch(`${API}/api/v1/public/settings`)).headers;
check('API: Helmet headers (CSP, HSTS, nosniff), no X-Powered-By', !!apiH.get('content-security-policy') && !!apiH.get('strict-transport-security') && apiH.get('x-content-type-options') === 'nosniff' && !apiH.get('x-powered-by'));

// ── 10. Session lifecycle ────────────────────────────────────────────
await fetch(`${SITE}/api/v1/admin/auth/logout`, { method: 'POST', headers: authed(s1) });
const afterLogout = await fetch(`${SITE}/api/v1/admin/auth/me`, { headers: { cookie: s1.cookie } });
check('Old cookie is useless after logout (server-side invalidation)', afterLogout.status === 401);

// Clean up probe data with the second session
const list = await (await fetch(`${SITE}/api/v1/admin/tattoos?q=SEC%20probe&limit=100`, { headers: authed(s2) })).json();
const extra = await (await fetch(`${SITE}/api/v1/admin/tattoos?q=Mass&limit=100`, { headers: authed(s2) })).json();
const xssList = await (await fetch(`${SITE}/api/v1/admin/tattoos?q=alert&limit=100`, { headers: authed(s2) })).json();
for (const t of [...list.data, ...extra.data, ...xssList.data]) await fetch(`${SITE}/api/v1/admin/tattoos/${t.id}`, { method: 'DELETE', headers: authed(s2) });
const enqs = await (await fetch(`${SITE}/api/v1/admin/enquiries`, { headers: authed(s2) })).json();
for (const e of enqs.data) if (e.name.includes('<script>')) await fetch(`${SITE}/api/v1/admin/enquiries/${e.id}`, { method: 'DELETE', headers: authed(s2) });
await fetch(`${SITE}/api/v1/admin/auth/logout`, { method: 'POST', headers: authed(s2) });

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exitCode = 1;
