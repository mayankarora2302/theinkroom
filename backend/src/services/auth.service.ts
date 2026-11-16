import argon2 from 'argon2';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { randomToken, sha256 } from '../utils/crypto.js';

// OWASP-recommended Argon2id parameters (m=19 MiB, t=2, p=1).
const ARGON_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const MIN_PASSWORD_LENGTH = 12;

export const hashPassword = (password: string) => argon2.hash(password, ARGON_OPTIONS);

// Verified against when the email is unknown, so response timing does not reveal which emails exist.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= argon2.hash(randomToken(), ARGON_OPTIONS));

/** `identifier` is a username or an email address (already lower-cased). */
export async function verifyCredentials(identifier: string, password: string) {
  const user = await prisma.adminUser.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
  const hash = user?.passwordHash ?? (await getDummyHash());
  let ok = false;
  try {
    ok = await argon2.verify(hash, password);
  } catch {
    ok = false;
  }
  return ok && user ? user : null;
}

export async function createSession(adminUserId: string, userAgent?: string) {
  const token = randomToken(32);
  const csrfToken = randomToken(32);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600 * 1000);
  const session = await prisma.adminSession.create({
    data: { tokenHash: sha256(token), csrfToken, adminUserId, expiresAt, userAgent: userAgent?.slice(0, 300) },
  });
  // Opportunistic cleanup of expired sessions.
  prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
  return { token, csrfToken, expiresAt: session.expiresAt };
}

export async function getSessionByToken(token: string) {
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { adminUser: { select: { id: true, email: true, username: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return session;
}

export async function destroySession(sessionId: string) {
  await prisma.adminSession.deleteMany({ where: { id: sessionId } });
}
