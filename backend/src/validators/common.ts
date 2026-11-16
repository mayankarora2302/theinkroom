import { z } from 'zod';

/** Trimmed string; empty becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const sizeEnum = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
  z.enum(['SMALL', 'MEDIUM', 'LARGE'], { error: 'Choose Small, Medium or Large' }),
);

/** Accepts booleans and the strings multipart forms send. */
export const formBoolean = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true', '1', 'on', 'yes'].includes(v.toLowerCase());
  return false;
}, z.boolean());

export const uuid = z.string().uuid('Invalid id');
