import { z } from 'zod';
import { formBoolean, optionalText, sizeEnum } from './common.js';

const price = z.preprocess(
  (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[₹,\s]/g, '');
      if (cleaned === '') return null;
      return Number(cleaned);
    }
    return v;
  },
  z
    .number({ error: 'Enter the price as a number, e.g. 12000' })
    .int('Use whole rupees, without paise')
    .min(1, 'Leave the price empty instead of entering 0')
    .max(10_000_000, 'That price looks too high — please check it')
    .nullable(),
);

export const tattooFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Give the tattoo a title').max(120, 'Keep the title under 120 characters'),
  description: z.string().trim().max(4000, 'Keep the description under 4,000 characters').default(''),
  size: sizeEnum,
  estimatedPrice: price.default(null),
  style: optionalText(80),
  placement: optionalText(80),
  imageAlt: z.string().trim().max(300, 'Keep the alt text under 300 characters').default(''),
  isPublished: formBoolean.default(false),
  isFeatured: formBoolean.default(false),
});

export type TattooFields = z.infer<typeof tattooFieldsSchema>;

export const tattooUpdateSchema = tattooFieldsSchema.partial();

export const publicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  size: z.preprocess(
    (v) => (typeof v === 'string' && v ? v.toUpperCase() : undefined),
    z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  ),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  exclude: z.string().trim().max(120).optional(),
});

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  size: z.preprocess(
    (v) => (typeof v === 'string' && v ? v.toUpperCase() : undefined),
    z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  ),
  status: z.enum(['all', 'published', 'draft']).default('all'),
  featured: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(80).optional(),
});

export const featuredToggleSchema = z.object({ isFeatured: z.boolean() });

export const featuredReorderSchema = z.object({
  ids: z.array(z.string().uuid('Invalid id')).max(50),
});
