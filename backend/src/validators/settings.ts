import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);

const whatsapp = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d]/g, ''))
  .refine((v) => v === '' || (v.length >= 8 && v.length <= 15), {
    message: 'Enter the full number with country code, e.g. +91 98765 43210',
  });

const instagram = z
  .string()
  .trim()
  .transform((v) => {
    if (!v) return '';
    if (/^@?[A-Za-z0-9._]{1,30}$/.test(v)) return `https://www.instagram.com/${v.replace(/^@/, '')}/`;
    return v;
  })
  .refine((v) => v === '' || /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(v), {
    message: 'Enter your Instagram handle (e.g. @yourname) or profile link',
  });

export const settingsUpdateSchema = z.object({
  artistName: text(80),
  brandName: text(80).min(1, 'The brand name is shown in the header, so it cannot be empty'),
  tagline: text(160),
  homepageIntroduction: text(600),
  biography: text(6000),
  philosophy: text(2000),
  experience: text(1500),
  styles: z.array(text(40).min(1)).max(12, 'List up to 12 styles').default([]),
  phone: text(24).refine((v) => v === '' || /^[+\d][\d\s()-]{5,22}$/.test(v), 'Enter a valid phone number'),
  whatsappNumber: whatsapp,
  instagramUrl: instagram,
  contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(160)]),
  location: text(160),
  portraitAlt: text(300).default(''),
  processSteps: z
    .array(z.object({ title: text(60).min(1, 'Each step needs a title'), body: text(600) }))
    .max(8, 'Keep the process to 8 steps or fewer')
    .default([]),
  faqs: z
    .array(z.object({ question: text(160).min(1, 'Each FAQ needs a question'), answer: text(1500).min(1, 'Each FAQ needs an answer') }))
    .max(20, 'Keep it to 20 questions or fewer')
    .default([]),
  featuredLimit: z.coerce.number().int().min(1, 'Show at least 1').max(12, 'Show at most 12').default(7),
});

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
