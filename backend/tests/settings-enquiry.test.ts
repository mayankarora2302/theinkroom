import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ORIGIN, app, createTattoo, resetDb, signIn } from './helpers.js';

beforeEach(resetDb);

describe('site settings', () => {
  it('serves public settings with default content', async () => {
    const res = await request(app).get('/api/v1/public/settings').expect(200);
    expect(res.body.data.brandName).toBe('The Ink Room');
    expect(res.body.data.processSteps.length).toBeGreaterThan(0);
    expect(res.body.data).not.toHaveProperty('featuredLimit');
  });

  it('normalises and validates contact details', async () => {
    const s = await signIn();
    const current = (await s.agent.get('/api/v1/admin/settings')).body.data;
    const base = { ...current, portrait: undefined, updatedAt: undefined };
    const ok = await s.agent
      .put('/api/v1/admin/settings')
      .set('X-CSRF-Token', s.csrf)
      .send({ ...base, whatsappNumber: '+91 98765 43210', instagramUrl: '@some.artist' })
      .expect(200);
    expect(ok.body.data.whatsappNumber).toBe('919876543210');
    expect(ok.body.data.instagramUrl).toBe('https://www.instagram.com/some.artist/');

    const bad = await s.agent.put('/api/v1/admin/settings').set('X-CSRF-Token', s.csrf).send({ ...base, contactEmail: 'nope' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.contactEmail).toBeTruthy();
  });
});

describe('enquiries', () => {
  const valid = { name: 'Asha', phone: '+91 98765 43210', idea: 'A small botanical piece on the wrist', contactMethod: 'WHATSAPP' };

  it('accepts a valid enquiry and links it to a tattoo', async () => {
    const s = await signIn();
    const t = (await createTattoo(s)).body.data;
    await request(app).post('/api/v1/public/enquiries').set('Origin', ORIGIN).send({ ...valid, tattooSlug: t.slug }).expect(201);
    const list = await s.agent.get('/api/v1/admin/enquiries').expect(200);
    expect(list.body.data[0].tattooTitle).toBe(t.title);
  });

  it('validates required fields', async () => {
    const res = await request(app).post('/api/v1/public/enquiries').send({ ...valid, idea: 'hi', contactMethod: 'EMAIL' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.idea).toBeTruthy();
    expect(res.body.error.fields.email).toBeTruthy();
  });

  it('silently drops honeypot submissions', async () => {
    const s = await signIn();
    await request(app).post('/api/v1/public/enquiries').send({ ...valid, website: 'spam' });
    const list = await s.agent.get('/api/v1/admin/enquiries');
    expect(list.body.data).toHaveLength(0);
  });
});
