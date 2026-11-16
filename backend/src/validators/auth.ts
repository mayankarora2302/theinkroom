import { z } from 'zod';

/** Usernames: 3–40 lowercase letters, digits, dots, underscores or hyphens. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,40}$/;

const identifier = z
  .string({ error: 'Enter your username or email' })
  .trim()
  .toLowerCase()
  .min(1, 'Enter your username or email')
  .max(160)
  .refine((v) => USERNAME_PATTERN.test(v) || z.string().email().safeParse(v).success, 'Enter your username or email');

/** Accepts `{ username, password }` or the older `{ email, password }` shape. */
export const loginSchema = z
  .object({
    username: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Enter your password').max(256),
  })
  .transform((v, ctx) => {
    const parsed = identifier.safeParse(v.username ?? v.email ?? '');
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', path: ['username'], message: parsed.error.issues[0]?.message ?? 'Enter your username or email' });
      return z.NEVER;
    }
    return { identifier: parsed.data, password: v.password };
  });
