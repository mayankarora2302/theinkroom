import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ORIGIN, app, createTattoo, resetDb, signIn, testImage } from './helpers.js';

beforeEach(resetDb);

describe('tattoo management', () => {
  it('uploads a photograph, optimises it to WebP and stores metadata', async () => {
    const s = await signIn();
    const res = await createTattoo(s, { estimatedPrice: '₹12,500', style: 'Fine line', placement: 'Forearm' });
    expect(res.status).toBe(201);
    const t = res.body.data;
    expect(t.slug).toBe('fine-line-peony');
    expect(t.estimatedPrice).toBe(12500);
    expect(t.image.url).toMatch(/\.webp$/);
    expect(t.image.width).toBe(1200);
    expect(t.image.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    const img = await request(app).get(new URL(t.image.url).pathname).expect(200);
    expect(img.headers['content-type']).toBe('image/webp');
  });

  it('keeps slugs unique', async () => {
    const s = await signIn();
    await createTattoo(s);
    const res = await createTattoo(s);
    expect(res.body.data.slug).toBe('fine-line-peony-2');
  });

  it('stores an empty price as null rather than 0', async () => {
    const s = await signIn();
    const res = await createTattoo(s, { estimatedPrice: '' });
    expect(res.body.data.estimatedPrice).toBeNull();
    const zero = await createTattoo(s, { estimatedPrice: '0' });
    expect(zero.status).toBe(400);
  });

  it('rejects missing images, non-images and images that are too small', async () => {
    const s = await signIn();
    const noImage = await s.agent.post('/api/v1/admin/tattoos').set('X-CSRF-Token', s.csrf).field('title', 'x').field('size', 'SMALL');
    expect(noImage.status).toBe(400);

    const fake = await s.agent
      .post('/api/v1/admin/tattoos')
      .set('X-CSRF-Token', s.csrf)
      .attach('image', Buffer.from('definitely not a jpeg'), { filename: 'x.jpg', contentType: 'image/jpeg' })
      .field('title', 'x')
      .field('size', 'SMALL');
    expect(fake.status).toBe(422);

    const gif = await s.agent
      .post('/api/v1/admin/tattoos')
      .set('X-CSRF-Token', s.csrf)
      .attach('image', Buffer.from('GIF89a'), { filename: 'x.gif', contentType: 'image/gif' })
      .field('title', 'x')
      .field('size', 'SMALL');
    expect(gif.status).toBe(415);

    const tiny = await s.agent
      .post('/api/v1/admin/tattoos')
      .set('X-CSRF-Token', s.csrf)
      .attach('image', await testImage(300, 300), { filename: 'x.jpg', contentType: 'image/jpeg' })
      .field('title', 'x')
      .field('size', 'SMALL');
    expect(tiny.status).toBe(422);
  });

  it('rejects files over the configured size limit', async () => {
    const s = await signIn();
    const big = Buffer.alloc(3 * 1024 * 1024, 1);
    const res = await s.agent
      .post('/api/v1/admin/tattoos')
      .set('X-CSRF-Token', s.csrf)
      .attach('image', big, { filename: 'big.jpg', contentType: 'image/jpeg' })
      .field('title', 'x')
      .field('size', 'SMALL');
    expect(res.status).toBe(413);
  });

  it('validates fields with helpful messages', async () => {
    const s = await signIn();
    const res = await createTattoo(s, { title: '', size: 'HUGE' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.title).toBeTruthy();
    expect(res.body.error.fields.size).toBeTruthy();
  });

  it('only exposes published work publicly', async () => {
    const s = await signIn();
    const draft = (await createTattoo(s, { title: 'Draft piece', isPublished: 'false' })).body.data;
    await createTattoo(s, { title: 'Live piece', size: 'SMALL' });

    const list = await request(app).get('/api/v1/public/tattoos').expect(200);
    expect(list.body.data.map((t: { title: string }) => t.title)).toEqual(['Live piece']);
    expect(list.body.data[0]).not.toHaveProperty('isPublished');
    await request(app).get(`/api/v1/public/tattoos/${draft.slug}`).expect(404);

    await s.agent.put(`/api/v1/admin/tattoos/${draft.id}`).set('X-CSRF-Token', s.csrf).field('isPublished', 'true').expect(200);
    await request(app).get(`/api/v1/public/tattoos/${draft.slug}`).expect(200);
  });

  it('filters and paginates the public portfolio', async () => {
    const s = await signIn();
    await createTattoo(s, { title: 'A', size: 'SMALL' });
    await createTattoo(s, { title: 'B', size: 'LARGE' });
    await createTattoo(s, { title: 'C', size: 'SMALL' });
    const small = await request(app).get('/api/v1/public/tattoos?size=small').expect(200);
    expect(small.body.data).toHaveLength(2);
    expect(small.body.meta.counts).toEqual({ ALL: 3, SMALL: 2, MEDIUM: 0, LARGE: 1 });
    const page = await request(app).get('/api/v1/public/tattoos?limit=2&page=2').expect(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta.hasMore).toBe(false);
    await request(app).get('/api/v1/public/tattoos?limit=500').expect(400);
  });

  it('edits details without resetting unspecified fields, and replaces the image', async () => {
    const s = await signIn();
    const t = (await createTattoo(s, { estimatedPrice: '9000', style: 'Blackwork' })).body.data;
    const res = await s.agent
      .put(`/api/v1/admin/tattoos/${t.id}`)
      .set('X-CSRF-Token', s.csrf)
      .field('title', 'Renamed')
      .attach('image', await testImage(1600, 1000, 'png'), { filename: 'new.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.data.title).toBe('Renamed');
    expect(res.body.data.slug).toBe(t.slug);
    expect(res.body.data.style).toBe('Blackwork');
    expect(res.body.data.estimatedPrice).toBe(9000);
    expect(res.body.data.image.width).toBe(1600);
    expect(res.body.data.image.url).not.toBe(t.image.url);
    await request(app).get(new URL(t.image.url).pathname).expect(404);
  });

  it('deletes a tattoo and its files', async () => {
    const s = await signIn();
    const t = (await createTattoo(s)).body.data;
    await s.agent.delete(`/api/v1/admin/tattoos/${t.id}`).set('Origin', ORIGIN).set('X-CSRF-Token', s.csrf).expect(204);
    await request(app).get(`/api/v1/public/tattoos/${t.slug}`).expect(404);
    await request(app).get(new URL(t.image.url).pathname).expect(404);
    await s.agent.delete(`/api/v1/admin/tattoos/${t.id}`).set('X-CSRF-Token', s.csrf).expect(404);
  });
});

describe('featured work', () => {
  it('returns featured published work in the saved order', async () => {
    const s = await signIn();
    const a = (await createTattoo(s, { title: 'A' })).body.data;
    const b = (await createTattoo(s, { title: 'B' })).body.data;
    const c = (await createTattoo(s, { title: 'C' })).body.data;
    await s.agent.put('/api/v1/admin/featured/reorder').set('X-CSRF-Token', s.csrf).send({ ids: [c.id, a.id] }).expect(200);
    let featured = await request(app).get('/api/v1/public/featured').expect(200);
    expect(featured.body.data.map((t: { title: string }) => t.title)).toEqual(['C', 'A']);

    await s.agent.put('/api/v1/admin/featured/reorder').set('X-CSRF-Token', s.csrf).send({ ids: [a.id, b.id, c.id] }).expect(200);
    featured = await request(app).get('/api/v1/public/featured').expect(200);
    expect(featured.body.data.map((t: { title: string }) => t.title)).toEqual(['A', 'B', 'C']);
  });

  it('refuses to feature unpublished work and removes featuring on unpublish', async () => {
    const s = await signIn();
    const draft = (await createTattoo(s, { isPublished: 'false' })).body.data;
    await s.agent.patch(`/api/v1/admin/tattoos/${draft.id}/featured`).set('X-CSRF-Token', s.csrf).send({ isFeatured: true }).expect(400);
    await s.agent.put('/api/v1/admin/featured/reorder').set('X-CSRF-Token', s.csrf).send({ ids: [draft.id] }).expect(400);
    expect((await createTattoo(s, { isPublished: 'false', isFeatured: 'true' })).status).toBe(400);

    const live = (await createTattoo(s, { isFeatured: 'true' })).body.data;
    expect(live.isFeatured).toBe(true);
    const unpub = await s.agent.put(`/api/v1/admin/tattoos/${live.id}`).set('X-CSRF-Token', s.csrf).field('isPublished', 'false').expect(200);
    expect(unpub.body.data.isFeatured).toBe(false);
    expect((await request(app).get('/api/v1/public/featured')).body.data).toHaveLength(0);
  });

  it('enforces the configurable carousel limit', async () => {
    const s = await signIn();
    const settings = (await s.agent.get('/api/v1/admin/settings').expect(200)).body.data;
    await s.agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', s.csrf)
      .send({ ...settings, featuredLimit: 2, portrait: undefined, updatedAt: undefined })
      .expect(200);
    const ids = [];
    for (const title of ['A', 'B', 'C']) ids.push((await createTattoo(s, { title })).body.data.id);
    await s.agent.put('/api/v1/admin/featured/reorder').set('X-CSRF-Token', s.csrf).send({ ids }).expect(400);
    await s.agent.patch(`/api/v1/admin/tattoos/${ids[0]}/featured`).set('X-CSRF-Token', s.csrf).send({ isFeatured: true }).expect(200);
    await s.agent.patch(`/api/v1/admin/tattoos/${ids[1]}/featured`).set('X-CSRF-Token', s.csrf).send({ isFeatured: true }).expect(200);
    await s.agent.patch(`/api/v1/admin/tattoos/${ids[2]}/featured`).set('X-CSRF-Token', s.csrf).send({ isFeatured: true }).expect(409);
  });
});
