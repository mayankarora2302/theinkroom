import type { Request, Response } from 'express';
import { SESSION_COOKIE, sessionCookieOptions } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { createSession, destroySession, verifyCredentials } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';
import { loginSchema } from '../validators/auth.js';

export async function login(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const { identifier, password } = parse(loginSchema, req.body);
  const user = await verifyCredentials(identifier, password);
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'That username and password combination is not recognised.');
  const session = await createSession(user.id, req.get('user-agent'));
  res.cookie(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
  res.json({ data: { user: { id: user.id, email: user.email, username: user.username }, csrfToken: session.csrfToken, expiresAt: session.expiresAt } });
}

export async function logout(req: Request, res: Response) {
  if (req.adminSession) await destroySession(req.adminSession.id);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ data: { signedOut: true } });
}

export async function me(req: Request, res: Response) {
  res.json({ data: { user: req.admin, csrfToken: req.adminSession!.csrfToken, expiresAt: req.adminSession!.expiresAt } });
}
