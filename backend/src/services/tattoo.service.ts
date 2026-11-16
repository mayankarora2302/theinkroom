import { Prisma, type Tattoo, type TattooSize } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { randomToken } from '../utils/crypto.js';
import { HttpError, badRequest, conflict, notFound } from '../utils/http-error.js';
import { slugify } from '../utils/slug.js';
import type { TattooFields } from '../validators/tattoo.js';
import { processImage, type ProcessedImage } from './image.service.js';
import { revalidatePublicSite } from './revalidate.service.js';
import { getSettingsRow } from './settings.service.js';
import { storage } from './storage.service.js';

/* ───────────────────────────── DTOs ───────────────────────────── */

export function toPublicTattoo(t: Tattoo) {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    description: t.description,
    size: t.size,
    estimatedPrice: t.estimatedPrice,
    style: t.style,
    placement: t.placement,
    image: {
      url: storage.publicUrl(t.imagePath),
      thumbUrl: storage.publicUrl(t.thumbPath),
      width: t.imageWidth,
      height: t.imageHeight,
      alt: t.imageAlt || t.title,
      blurDataUrl: t.blurDataUrl,
    },
    createdAt: t.createdAt,
  };
}

export function toAdminTattoo(t: Tattoo) {
  return {
    ...toPublicTattoo(t),
    imageAlt: t.imageAlt,
    isPublished: t.isPublished,
    isFeatured: t.isFeatured,
    featuredOrder: t.featuredOrder,
    updatedAt: t.updatedAt,
  };
}

/* ─────────────────────────── Public reads ─────────────────────────── */

const publishedWhere = (extra: Prisma.TattooWhereInput = {}): Prisma.TattooWhereInput => ({ isPublished: true, ...extra });

const searchWhere = (q?: string): Prisma.TattooWhereInput =>
  q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { style: { contains: q, mode: 'insensitive' } },
          { placement: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

export async function listPublished(opts: {
  page: number;
  limit: number;
  size?: TattooSize;
  q?: string;
  sort: 'newest' | 'oldest';
  exclude?: string;
}) {
  const where = publishedWhere({
    ...(opts.size ? { size: opts.size } : {}),
    ...searchWhere(opts.q),
    ...(opts.exclude ? { slug: { not: opts.exclude } } : {}),
  });
  const direction = opts.sort === 'oldest' ? 'asc' : 'desc';
  const [items, total, grouped] = await Promise.all([
    prisma.tattoo.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
    }),
    prisma.tattoo.count({ where }),
    prisma.tattoo.groupBy({ by: ['size'], where: publishedWhere(searchWhere(opts.q)), _count: { _all: true } }),
  ]);
  const counts = { ALL: 0, SMALL: 0, MEDIUM: 0, LARGE: 0 };
  for (const g of grouped) {
    counts[g.size] = g._count._all;
    counts.ALL += g._count._all;
  }
  return {
    items: items.map(toPublicTattoo),
    meta: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
      hasMore: opts.page * opts.limit < total,
      counts,
    },
  };
}

export async function getPublishedBySlug(slug: string) {
  const tattoo = await prisma.tattoo.findFirst({ where: publishedWhere({ slug }) });
  if (!tattoo) throw notFound('This piece is not in the portfolio.');

  const [newer, older, sameSize] = await Promise.all([
    prisma.tattoo.findFirst({
      where: publishedWhere({ createdAt: { gt: tattoo.createdAt } }),
      orderBy: { createdAt: 'asc' },
      select: { slug: true, title: true },
    }),
    prisma.tattoo.findFirst({
      where: publishedWhere({ createdAt: { lt: tattoo.createdAt } }),
      orderBy: { createdAt: 'desc' },
      select: { slug: true, title: true },
    }),
    prisma.tattoo.findMany({
      where: publishedWhere({ size: tattoo.size, id: { not: tattoo.id } }),
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ]);

  let related = sameSize;
  if (related.length < 4) {
    const fill = await prisma.tattoo.findMany({
      where: publishedWhere({ id: { notIn: [tattoo.id, ...related.map((r) => r.id)] } }),
      orderBy: { createdAt: 'desc' },
      take: 4 - related.length,
    });
    related = [...related, ...fill];
  }

  return {
    tattoo: toPublicTattoo(tattoo),
    previous: newer,
    next: older,
    related: related.map(toPublicTattoo),
  };
}

export async function listFeaturedPublished() {
  const settings = await getSettingsRow();
  const items = await prisma.tattoo.findMany({
    where: publishedWhere({ isFeatured: true }),
    orderBy: [{ featuredOrder: 'asc' }, { updatedAt: 'desc' }],
    take: settings.featuredLimit,
  });
  return items.map(toPublicTattoo);
}

export async function listPublishedSlugs() {
  return prisma.tattoo.findMany({
    where: publishedWhere(),
    select: { slug: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
}

/* ─────────────────────────── Admin reads ─────────────────────────── */

export async function listForAdmin(opts: {
  page: number;
  limit: number;
  size?: TattooSize;
  status: 'all' | 'published' | 'draft';
  featured?: 'true' | 'false';
  q?: string;
}) {
  const where: Prisma.TattooWhereInput = {
    ...(opts.size ? { size: opts.size } : {}),
    ...(opts.status === 'published' ? { isPublished: true } : opts.status === 'draft' ? { isPublished: false } : {}),
    ...(opts.featured ? { isFeatured: opts.featured === 'true' } : {}),
    ...searchWhere(opts.q),
  };
  const [items, total] = await Promise.all([
    prisma.tattoo.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
    }),
    prisma.tattoo.count({ where }),
  ]);
  return {
    items: items.map(toAdminTattoo),
    meta: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
}

export async function getForAdmin(id: string) {
  const t = await prisma.tattoo.findUnique({ where: { id } });
  if (!t) throw notFound('That tattoo no longer exists.');
  return toAdminTattoo(t);
}

export async function getStats() {
  const [total, published, featured, newEnquiries] = await Promise.all([
    prisma.tattoo.count(),
    prisma.tattoo.count({ where: { isPublished: true } }),
    prisma.tattoo.count({ where: { isPublished: true, isFeatured: true } }),
    prisma.enquiry.count({ where: { status: 'NEW' } }),
  ]);
  const settings = await getSettingsRow();
  return { total, published, unpublished: total - published, featured, featuredLimit: settings.featuredLimit, newEnquiries };
}

/* ─────────────────────────── Mutations ─────────────────────────── */

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title);
  const taken = await prisma.tattoo.findMany({
    where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  });
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    if (!set.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${randomToken(4).toLowerCase()}`;
}

async function uploadRenditions(tattooId: string, img: ProcessedImage) {
  const key = randomToken(6).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'img';
  const imagePath = `tattoos/${tattooId}/${key}-full.webp`;
  const thumbPath = `tattoos/${tattooId}/${key}-thumb.webp`;
  await storage.upload(imagePath, img.full, 'image/webp');
  try {
    await storage.upload(thumbPath, img.thumb, 'image/webp');
  } catch (err) {
    await storage.remove([imagePath]);
    throw err;
  }
  return { imagePath, thumbPath };
}

/** Next featured slot, enforcing the configurable carousel limit. */
async function nextFeaturedOrder(excludeId?: string) {
  const settings = await getSettingsRow();
  const where: Prisma.TattooWhereInput = { isFeatured: true, isPublished: true, ...(excludeId ? { id: { not: excludeId } } : {}) };
  const count = await prisma.tattoo.count({ where });
  if (count >= settings.featuredLimit) {
    throw conflict(
      `The homepage carousel already shows ${settings.featuredLimit} works, which is the limit. Remove one from Featured work first, or raise the limit in Settings.`,
    );
  }
  const max = await prisma.tattoo.aggregate({ where, _max: { featuredOrder: true } });
  return (max._max.featuredOrder ?? -1) + 1;
}

export async function createTattoo(fields: TattooFields, file: Buffer | undefined) {
  if (!file) throw new HttpError(400, 'VALIDATION_ERROR', 'Add a photograph of the tattoo.', { fields: { image: 'Add a photograph of the tattoo.' } });
  if (fields.isFeatured && !fields.isPublished) {
    throw badRequest('Only published tattoos can be featured on the homepage. Publish it, or untick “Feature on homepage”.');
  }

  const img = await processImage(file);
  const featuredOrder = fields.isFeatured ? await nextFeaturedOrder() : null;
  const id = randomUUID();
  const paths = await uploadRenditions(id, img);

  try {
    const slug = await uniqueSlug(fields.title);
    const created = await prisma.tattoo.create({
      data: {
        id,
        slug,
        ...fields,
        ...paths,
        imageWidth: img.width,
        imageHeight: img.height,
        blurDataUrl: img.blurDataUrl,
        featuredOrder,
      },
    });
    revalidatePublicSite(['tattoos', 'featured']);
    return toAdminTattoo(created);
  } catch (err) {
    await storage.remove([paths.imagePath, paths.thumbPath]);
    throw err;
  }
}

export async function updateTattoo(id: string, fields: Partial<TattooFields>, file: Buffer | undefined) {
  const current = await prisma.tattoo.findUnique({ where: { id } });
  if (!current) throw notFound('That tattoo no longer exists.');

  const willPublish = fields.isPublished ?? current.isPublished;
  const wantFeatured = (fields.isFeatured ?? current.isFeatured) && willPublish;
  if (fields.isFeatured && !willPublish) {
    throw badRequest('Only published tattoos can be featured on the homepage. Publish it, or untick “Feature on homepage”.');
  }

  const data: Prisma.TattooUpdateInput = { ...fields, isFeatured: wantFeatured };
  if (!wantFeatured) data.featuredOrder = null;
  else if (!current.isFeatured || !current.isPublished) data.featuredOrder = await nextFeaturedOrder(id);

  let newPaths: { imagePath: string; thumbPath: string } | undefined;
  if (file) {
    const img = await processImage(file);
    newPaths = await uploadRenditions(id, img);
    Object.assign(data, newPaths, { imageWidth: img.width, imageHeight: img.height, blurDataUrl: img.blurDataUrl });
  }

  try {
    const updated = await prisma.tattoo.update({ where: { id }, data });
    if (newPaths) await storage.remove([current.imagePath, current.thumbPath]);
    revalidatePublicSite(['tattoos', 'featured']);
    return toAdminTattoo(updated);
  } catch (err) {
    if (newPaths) await storage.remove([newPaths.imagePath, newPaths.thumbPath]);
    throw err;
  }
}

export async function deleteTattoo(id: string) {
  const current = await prisma.tattoo.findUnique({ where: { id } });
  if (!current) throw notFound('That tattoo no longer exists.');
  await prisma.tattoo.delete({ where: { id } });
  await storage.remove([current.imagePath, current.thumbPath]);
  revalidatePublicSite(['tattoos', 'featured']);
}

export async function setFeatured(id: string, isFeatured: boolean) {
  const current = await prisma.tattoo.findUnique({ where: { id } });
  if (!current) throw notFound('That tattoo no longer exists.');
  if (isFeatured && !current.isPublished) throw badRequest('Publish this tattoo before featuring it on the homepage.');
  if (isFeatured === current.isFeatured) return toAdminTattoo(current);
  const featuredOrder = isFeatured ? await nextFeaturedOrder(id) : null;
  const updated = await prisma.tattoo.update({ where: { id }, data: { isFeatured, featuredOrder } });
  revalidatePublicSite(['featured']);
  return toAdminTattoo(updated);
}

/**
 * Replaces the homepage selection with exactly `ids`, in that order.
 * Anything not listed is removed from the carousel.
 */
export async function setFeaturedSelection(ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) throw badRequest('Each tattoo can only appear once in the carousel.');
  const settings = await getSettingsRow();
  if (ids.length > settings.featuredLimit) {
    throw badRequest(`The carousel can show up to ${settings.featuredLimit} works. Remove ${ids.length - settings.featuredLimit} to save.`);
  }
  const found = await prisma.tattoo.findMany({ where: { id: { in: ids } }, select: { id: true, isPublished: true, title: true } });
  if (found.length !== ids.length) throw notFound('One of the selected tattoos no longer exists. Refresh the page and try again.');
  const draft = found.find((t) => !t.isPublished);
  if (draft) throw badRequest(`“${draft.title}” is not published, so it cannot appear on the homepage.`);

  await prisma.$transaction([
    prisma.tattoo.updateMany({
      where: { isFeatured: true, id: { notIn: ids } },
      data: { isFeatured: false, featuredOrder: null },
    }),
    ...ids.map((tid, index) => prisma.tattoo.update({ where: { id: tid }, data: { isFeatured: true, featuredOrder: index } })),
  ]);
  revalidatePublicSite(['featured']);
  const items = await prisma.tattoo.findMany({ where: { isFeatured: true }, orderBy: { featuredOrder: 'asc' } });
  return items.map(toAdminTattoo);
}
