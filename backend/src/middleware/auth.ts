import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env, isProd } from '../config/env.js';
import { getSessionByToken } from '../services/auth.service.js';
import { HttpError, unauthenticated } from '../utils/http-error.js';

export const SESSION_COOKIE = isProd ? '__Host-ir_session' : 'ir_session';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: { id: string; email: string | null; username: string | null };
    adminSession?: { id: string; csrfToken: string; expiresAt: Date };
  }
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    expires,
  };
}

/** Rejects the request unless it carries a valid, unexpired admin session cookie. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token.length < 20) return next(unauthenticated());
  const session = await getSessionByToken(token);
  if (!session) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return next(unauthenticated('Your session has expired. Please sign in again.'));
  }
  req.admin = { id: session.adminUser.id, email: session.adminUser.email, username: session.adminUser.username };
  req.adminSession = { id: session.id, csrfToken: session.csrfToken, expiresAt: session.expiresAt };
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function allowedOrigin(origin: string) {
  return origin === env.FRONTEND_ORIGIN || origin === new URL(env.PUBLIC_API_URL).origin;
}

/**
 * Origin check for state-changing requests. Browsers always send Origin on
 * cross-site POST/PUT/PATCH/DELETE, so a mismatching Origin means a forged request.
 */
export function checkOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !allowedOrigin(origin)) {
    return next(new HttpError(403, 'CSRF_INVALID', 'This request came from an unexpected origin.'));
  }
  next();
}

/** Synchroniser-token CSRF protection for cookie-authenticated mutations. */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const header = req.get('x-csrf-token') ?? '';
  const expected = req.adminSession?.csrfToken ?? '';
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(new HttpError(403, 'CSRF_INVALID', 'Your session token is out of date. Refresh the page and try again.'));
  }
  next();
}
