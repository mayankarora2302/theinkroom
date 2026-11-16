import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';

const base: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.DISABLE_RATE_LIMIT,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: { code: 'RATE_LIMITED', message: String(options.message) },
    });
  },
};

export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

/**
 * Per-account limit on failed sign-ins, keyed on the username/email being tried rather than the
 * client IP. IP-based limits can be dodged by forging X-Forwarded-For when no trusted load balancer
 * rewrites it; this one cannot, so password guessing against the artist's account stays slow.
 */
export const accountLoginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const body = (req.body ?? {}) as { username?: unknown; email?: unknown };
    const id = typeof body.username === 'string' ? body.username : typeof body.email === 'string' ? body.email : '';
    return `account:${id.trim().toLowerCase().slice(0, 160) || '-'}`;
  },
  message: 'Too many sign-in attempts for this account. Please wait 15 minutes and try again.',
});

/** Site-wide ceiling on enquiries, independent of IP, so spam stays bounded even with forged IPs. */
export const enquiryGlobalLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: () => 'enquiries:global',
  message: 'The enquiry form is busy right now. Please try again later, or message on WhatsApp.',
});

export const enquiryLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 6,
  message: 'You have sent several enquiries already. Please try again later, or message on WhatsApp.',
});

export const publicLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
  message: 'Too many requests. Please slow down.',
});
