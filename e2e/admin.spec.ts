import { expect, test } from '@playwright/test';
import { cleanupE2E, noisyPhoto, signIn, testPhoto } from './helpers';

test.describe('admin', () => {
  // Remove anything this suite created, even if a test failed halfway through.
  test.afterAll(async ({ browser }) => cleanupE2E(browser));

  test('signed-out visitors are sent to the login page', async ({ page, request }) => {
    await page.goto('/admin/tattoos');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Ftattoos/);
    const api = await request.get('/api/v1/admin/tattoos');
    expect(api.status()).toBe(401);
  });

  test('wrong password shows an error', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Username or email').fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('form [role="alert"]')).toContainText('not recognised');
  });

  test('upload, edit, feature, unpublish and delete a tattoo', async ({ page }) => {
    const title = `E2E piece ${Date.now()}`;
    await signIn(page);

    // Upload
    await page.goto('/admin/tattoos/new');
    await page.locator('input[type="file"]').setInputFiles({ name: 'piece.jpg', mimeType: 'image/jpeg', buffer: await testPhoto() });
    await expect(page.getByAltText('Preview of the selected photograph')).toBeVisible();
    await page.getByLabel('Title').fill(title);
    await page.getByText('Medium', { exact: true }).click();
    await page.getByLabel(/Estimated starting price/).fill('15000');
    await page.getByLabel(/Placement/).fill('Forearm');
    await page.getByRole('button', { name: 'Upload and publish' }).click();
    await expect(page).toHaveURL(/\/admin\/tattoos$/);
    await expect(page.getByRole('link', { name: title })).toBeVisible();

    // Public detail page shows it with the price and disclaimer
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    await page.goto(`/work/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('From ₹15,000')).toBeVisible();
    await expect(page.getByText(/confirmed at consultation/)).toBeVisible();

    // Edit: remove the price -> no price row at all
    await page.goto('/admin/tattoos');
    await page.getByRole('link', { name: title }).click();
    await page.getByLabel(/Estimated starting price/).fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    await page.goto(`/work/${slug}`);
    await expect(page.getByText('Estimated price')).toHaveCount(0);

    // Feature it and check the homepage carousel
    await page.goto('/admin/featured');
    await page.getByLabel(`Add “${title}” to the homepage`).check({ force: true }).catch(async () => {
      // carousel may be full in a dev database — make room first
      await page.getByRole('button', { name: /Remove “.+” from the homepage/ }).first().click();
      await page.getByLabel(`Add “${title}” to the homepage`).check({ force: true });
    });
    await page.getByRole('button', { name: `Move “${title}” up` }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/Homepage carousel updated/)).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Featured work' }).getByRole('button', { name: new RegExp(title) })).toBeVisible();

    // Unpublish -> gone from the public site and the carousel
    await page.goto('/admin/tattoos');
    await page.getByRole('link', { name: title }).click();
    await page.getByRole('switch', { name: 'Published' }).uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved.')).toBeVisible();
    const res = await page.goto(`/work/${slug}`);
    expect(res?.status()).toBe(404);

    // Delete with confirmation
    await page.goto('/admin/tattoos');
    await page.getByRole('button', { name: `Delete “${title}”` }).click();
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.getByText(`“${title}” was deleted.`)).toBeVisible();
    await expect(page.getByRole('link', { name: title })).toHaveCount(0);
  });

  test('large photos (over 10 MB) upload through the site proxy', async ({ page }) => {
    test.setTimeout(90_000);
    const title = `E2E piece large ${Date.now()}`;
    await signIn(page);
    await page.goto('/admin/tattoos/new');
    const photo = await noisyPhoto(3100);
    expect(photo.length).toBeGreaterThan(10 * 1024 * 1024);
    await page.locator('input[type="file"]').setInputFiles({ name: 'large.jpg', mimeType: 'image/jpeg', buffer: photo });
    await page.getByLabel('Title').fill(title);
    await page.getByText('Large', { exact: true }).click();
    await page.getByRole('switch', { name: 'Published' }).uncheck();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page).toHaveURL(/\/admin\/tattoos$/, { timeout: 60_000 });
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  });

  test('small photos upload, with a non-blocking warning', async ({ page }) => {
    const title = `E2E piece small ${Date.now()}`;
    await signIn(page);
    await page.goto('/admin/tattoos/new');
    await page.locator('input[type="file"]').setInputFiles({ name: 'small.jpg', mimeType: 'image/jpeg', buffer: await testPhoto(370, 503) });
    await expect(page.getByRole('status').filter({ hasText: 'fairly small (370×503px)' })).toBeVisible();
    await page.getByLabel('Title').fill(title);
    await page.getByText('Small', { exact: true }).click();
    await page.getByRole('switch', { name: 'Published' }).uncheck();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page).toHaveURL(/\/admin\/tattoos$/);
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  });

  test('rejects files that are not images', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/tattoos/new');
    await page.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.locator('form [role="alert"]').first()).toContainText('JPEG, PNG or WebP');
  });

  test('sign out ends the session', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
