import type { Request, Response } from 'express';
import { parse } from '../middleware/validate.js';
import { createEnquiry } from '../services/enquiry.service.js';
import { getSettingsRow, toSettingsDto } from '../services/settings.service.js';
import { getPublishedBySlug, listFeaturedPublished, listPublished, listPublishedSlugs } from '../services/tattoo.service.js';
import { enquirySchema } from '../validators/enquiry.js';
import { publicListQuerySchema } from '../validators/tattoo.js';

const cachePublic = (res: Response) => res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');

export async function listTattoos(req: Request, res: Response) {
  const query = parse(publicListQuerySchema, req.query);
  const result = await listPublished(query);
  cachePublic(res);
  res.json({ data: result.items, meta: result.meta });
}

export async function getTattoo(req: Request, res: Response) {
  const slug = String(req.params.slug).slice(0, 120);
  const result = await getPublishedBySlug(slug);
  cachePublic(res);
  res.json({ data: result });
}

export async function getFeatured(_req: Request, res: Response) {
  cachePublic(res);
  res.json({ data: await listFeaturedPublished() });
}

export async function getSlugs(_req: Request, res: Response) {
  cachePublic(res);
  res.json({ data: await listPublishedSlugs() });
}

export async function getSettings(_req: Request, res: Response) {
  const { featuredLimit: _limit, ...publicSettings } = toSettingsDto(await getSettingsRow());
  cachePublic(res);
  res.json({ data: publicSettings });
}

export async function postEnquiry(req: Request, res: Response) {
  const input = parse(enquirySchema, req.body);
  if (input.website) {
    // Honeypot filled: pretend success so bots learn nothing.
    res.status(201).json({ data: { received: true } });
    return;
  }
  await createEnquiry(input);
  res.status(201).json({ data: { received: true } });
}
