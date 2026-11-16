import { expect, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';

export async function signIn(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Username or email').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

export function testPhoto(width = 1200, height = 1500) {
  return sharp({ create: { width, height, channels: 3, background: { r: 70, g: 62, b: 55 } } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** A high-entropy JPEG: realistic file size for a full-resolution phone photo. */
export async function noisyPhoto(side: number) {
  const raw = Buffer.alloc(side * side * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (Math.random() * 256) | 0;
  return sharp(raw, { raw: { width: side, height: side, channels: 3 } }).jpeg({ quality: 100 }).toBuffer();
}

/** Deletes tattoos and enquiries created by the suite, so a dev database stays clean. */
export async function cleanupE2E(browser: Browser) {
  const page = await browser.newPage({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' });
  await signIn(page);
  const csrf = await page.evaluate(async () => (await (await fetch('/api/v1/admin/auth/me')).json()).data.csrfToken as string);
  const headers = { 'x-csrf-token': csrf };
  const tattoos = await page.request.get('/api/v1/admin/tattoos?q=E2E%20piece&limit=100');
  for (const t of (await tattoos.json()).data as Array<{ id: string; title: string }>) {
    if (t.title.startsWith('E2E piece')) await page.request.delete(`/api/v1/admin/tattoos/${t.id}`, { headers });
  }
  const enquiries = await page.request.get('/api/v1/admin/enquiries');
  for (const e of (await enquiries.json()).data as Array<{ id: string; name: string }>) {
    if (e.name === 'E2E Visitor') await page.request.delete(`/api/v1/admin/enquiries/${e.id}`, { headers });
  }
  await page.close();
}
