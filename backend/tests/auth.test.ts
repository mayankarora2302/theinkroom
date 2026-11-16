import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN, ORIGIN, app, resetDb, signIn } from './helpers.js';

beforeEach(resetDb);

describe('admin authentication', () => {
  it('rejects unknown credentials without revealing which part was wrong', async () => {
    const res = await request(app).post('/api/v1/admin/auth/login').send({ email: ADMIN.email, password: 'nope' });
    expect(res.status).toBe(401);
    const res2 = await request(app).post('/api/v1/admin/auth/login').send({ email: 'x@example.com', password: 'nope' });
    expect(res2.body.error.message).toBe(res.body.error.message);
  });

  it('accepts the username or the email, case-insensitively', async () => {
    await request(app).post('/api/v1/admin/auth/login').send({ username: 'TheArtist', password: ADMIN.password }).expect(200);
    await request(app).post('/api/v1/admin/auth/login').send({ username: ADMIN.email, password: ADMIN.password }).expect(200);
    await request(app).post('/api/v1/admin/auth/login').send({ email: ADMIN.email, password: ADMIN.password }).expect(200);
  });

  it('validates the login body', async () => {
    const res = await request(app).post('/api/v1/admin/auth/login').send({ username: 'not valid!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sets an HTTP-only session cookie and never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/admin/auth/login').send({ username: ADMIN.username, password: ADMIN.password }).expect(200);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    expect(res.body.data.csrfToken).toBeTruthy();
  });

  it('protects admin endpoints from anonymous access', async () => {
    for (const path of ['/api/v1/admin/auth/me', '/api/v1/admin/tattoos', '/api/v1/admin/settings', '/api/v1/admin/stats']) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
      expect(res.headers['cache-control']).toBe('no-store');
    }
    const del = await request(app).delete('/api/v1/admin/tattoos/00000000-0000-0000-0000-000000000000');
    expect(del.status).toBe(401);
  });

  it('requires the CSRF token for mutations', async () => {
    const { agent, csrf } = await signIn();
    const noToken = await agent.put('/api/v1/admin/featured/reorder').send({ ids: [] });
    expect(noToken.status).toBe(403);
    expect(noToken.body.error.code).toBe('CSRF_INVALID');
    const ok = await agent.put('/api/v1/admin/featured/reorder').set('X-CSRF-Token', csrf).send({ ids: [] });
    expect(ok.status).toBe(200);
  });

  it('rejects mutations from a foreign origin', async () => {
    const { agent, csrf } = await signIn();
    const res = await agent
      .put('/api/v1/admin/featured/reorder')
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', csrf)
      .send({ ids: [] });
    expect(res.status).toBe(403);
  });

  it('limits password guessing per account even when the client forges X-Forwarded-For', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/v1/admin/auth/login')
        .set('X-Forwarded-For', `203.0.113.${i + 1}`)
        .send({ username: 'guess-target', password: `wrong-${i}` });
      codes.push(res.status);
    }
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });

  it('invalidates the session on logout', async () => {
    const { agent, csrf } = await signIn();
    await agent.get('/api/v1/admin/auth/me').expect(200);
    await agent.post('/api/v1/admin/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', csrf).expect(200);
    await agent.get('/api/v1/admin/auth/me').expect(401);
  });
});
