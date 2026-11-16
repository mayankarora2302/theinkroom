import { z } from 'zod';
import { optionalText } from './common.js';

export const enquirySchema = z
  .object({
    name: z.string().trim().min(1, 'Please tell me your name').max(80),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s()-]{6,22}$/, 'Enter a phone number I can reach you on'),
    email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(160)]).optional(),
    idea: z
      .string()
      .trim()
      .min(10, 'A sentence or two about the idea helps — at least 10 characters')
      .max(2000, 'Keep it under 2,000 characters — we can go into detail later'),
    preferredSize: z.preprocess(
      (v) => (typeof v === 'string' && v ? v.toUpperCase() : undefined),
      z.enum(['SMALL', 'MEDIUM', 'LARGE', 'UNSURE']).optional(),
    ),
    placement: optionalText(80),
    contactMethod: z.enum(['WHATSAPP', 'PHONE', 'EMAIL'], { error: 'Choose how you would like to be contacted' }),
    tattooSlug: z.string().trim().max(120).optional(),
    /** Honeypot — real visitors never see or fill this. */
    website: z.string().max(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.contactMethod === 'EMAIL' && !v.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Add an email address, or choose another contact method' });
    }
  });

export const enquiryStatusSchema = z.object({ status: z.enum(['NEW', 'HANDLED']) });
