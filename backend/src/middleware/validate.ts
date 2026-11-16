import type { ZodType, z } from 'zod';
import { HttpError } from '../utils/http-error.js';

/** Parse `input` with `schema`, throwing a 400 with per-field messages on failure. */
export function parse<S extends ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Some of the information is not valid.';
  throw new HttpError(400, 'VALIDATION_ERROR', first, { fields });
}
