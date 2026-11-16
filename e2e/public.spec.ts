import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cleanupE2E } from './helpers';

test.describe('public website', () => {
  test.afterAll(async ({ browser }) => cleanupE2E(browser));

  test('homepage shows the hero and links into the portfolio', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book a consultation' }).first()).toBeVisible();
    const carousel = page.getByRole('region', { name: 'Featured work' });
    if (await carousel.count()) {
      const next = carousel.getByRole('button', { name: 'Next piece' });
      if (await next.count()) {
        const before = await carousel.locator('[aria-current="true"]').getAttribute('aria-label');
        await next.click();
        await expect(carousel.locator('[aria-current="true"]')).not.toHaveAttribute('aria-label', before ?? '');
      }
    }
  });

  test('work page filters by size and opens a detail page', async ({ page }) => {
    await page.goto('/work');
    await expect(page.getByRole('heading', { level: 1, name: /Work/ })).toBeVisible();
    const filter = page.getByRole('navigation', { name: 'Filter by size' });
    await filter.getByRole('link', { name: /Small/ }).click();
    await expect(page).toHaveURL(/size=small/);
    await expect(filter.getByRole('link', { name: 'Reset' })).toBeVisible();
    const cards = await page.locator('main ul li a').allTextContents();
    for (const text of cards) expect(text).toContain('Small');

    const first = page.locator('main ul li a').first();
    if (await first.count()) {
      await first.click();
      await expect(page).toHaveURL(/\/work\/.+/);
      await expect(page.getByRole('term').filter({ hasText: 'Size' })).toBeVisible();
      await expect(page.getByText('₹0')).toHaveCount(0);
    }
  });

  test('unknown tattoo shows a designed not-found page', async ({ page }) => {
    const res = await page.goto('/work/this-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('This piece is no longer on display.')).toBeVisible();
  });

  test('enquiry form validates and submits', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    await expect(page.getByText('Please tell me your name.')).toBeVisible();
    await expect(page.getByLabel('Name')).toBeFocused();

    await page.getByLabel('Name').fill('E2E Visitor');
    await page.getByLabel('Contact number').fill('+91 98765 43210');
    await page.getByText('Phone call').click();
    await page.getByLabel('Your tattoo idea').fill('A small line drawing of a heron on the ankle.');
    await page.getByText('Not sure').click();
    await page.getByRole('button', { name: /Send enquiry/ }).click();
    await expect(page.getByRole('status').getByText(/Thank you, E2E/)).toBeVisible();
  });

  test('public pages have no WCAG 2.2 AA violations (axe)', async ({ page }) => {
    for (const path of ['/', '/work', '/about', '/process', '/contact', '/admin/login']) {
      await page.goto(path);
      // Let scroll-reveal fades finish so contrast is measured on final colours.
      await page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
    }
  });

  test('SEO files are served', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Disallow: /admin');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('/work');
  });
});

test.describe('mobile @mobile', () => {
  test('menu opens, traps focus and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await toggle.click();
    const dialog = page.getByRole('dialog', { name: 'Site menu' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Work/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('no horizontal overflow on key pages', async ({ page }) => {
    for (const path of ['/work', '/about', '/process', '/contact']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
