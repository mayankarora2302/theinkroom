import sharp from 'sharp';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/services/auth.service.js';

export const app: App = createApp();
export const ORIGIN = 'http://localhost:3000';
export const ADMIN = { email: 'artist@example.com', username: 'theartist', password: 'correct horse battery staple' };

export async function resetDb() {
  await prisma.$transaction([
    prisma.enquiry.deleteMany(),
    prisma.tattoo.deleteMany(),
    prisma.adminSession.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.siteSettings.deleteMany(),
  ]);
  await prisma.adminUser.create({ data: { email: ADMIN.email, username: ADMIN.username, passwordHash: await hashPassword(ADMIN.password) } });
}

export async function testImage(width = 1200, height = 1500, format: 'jpeg' | 'png' = 'jpeg') {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 60, g: 55, b: 50 } } });
  return (format === 'png' ? img.png() : img.jpeg()).toBuffer();
}

/** Signs in and returns a supertest agent plus the CSRF token for mutations. */
export async function signIn() {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/admin/auth/login').set('Origin', ORIGIN).send({ username: ADMIN.username, password: ADMIN.password }).expect(200);
  return { agent, csrf: res.body.data.csrfToken as string };
}

export async function createTattoo(
  session: Awaited<ReturnType<typeof signIn>>,
  fields: Record<string, string> = {},
) {
  const req = session.agent
    .post('/api/v1/admin/tattoos')
    .set('Origin', ORIGIN)
    .set('X-CSRF-Token', session.csrf)
    .attach('image', await testImage(), { filename: 'piece.jpg', contentType: 'image/jpeg' });
  const all = { title: 'Fine line peony', size: 'MEDIUM', isPublished: 'true', isFeatured: 'false', ...fields };
  for (const [k, v] of Object.entries(all)) req.field(k, v);
  return req;
}
