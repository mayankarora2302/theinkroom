import type { Request, Response } from 'express';
import { parse } from '../middleware/validate.js';
import { deleteEnquiry, listEnquiries, setEnquiryStatus } from '../services/enquiry.service.js';
import { getSettingsRow, removePortrait, replacePortrait, toSettingsDto, updateSettings } from '../services/settings.service.js';
import * as tattoos from '../services/tattoo.service.js';
import { badRequest } from '../utils/http-error.js';
import { uuid } from '../validators/common.js';
import { enquiryStatusSchema } from '../validators/enquiry.js';
import { settingsUpdateSchema } from '../validators/settings.js';
import {
  adminListQuerySchema,
  featuredReorderSchema,
  featuredToggleSchema,
  tattooFieldsSchema,
  tattooUpdateSchema,
} from '../validators/tattoo.js';
import { z } from 'zod';

const idParam = (req: Request) => parse(uuid, req.params.id);

export async function stats(_req: Request, res: Response) {
  res.json({ data: await tattoos.getStats() });
}

export async function listTattoos(req: Request, res: Response) {
  const result = await tattoos.listForAdmin(parse(adminListQuerySchema, req.query));
  res.json({ data: result.items, meta: result.meta });
}

export async function getTattoo(req: Request, res: Response) {
  res.json({ data: await tattoos.getForAdmin(idParam(req)) });
}

export async function createTattoo(req: Request, res: Response) {
  const fields = parse(tattooFieldsSchema, req.body ?? {});
  const created = await tattoos.createTattoo(fields, req.file?.buffer);
  res.status(201).json({ data: created });
}

export async function updateTattoo(req: Request, res: Response) {
  const id = idParam(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  // Only validate fields that were actually sent, so partial updates don't reset values to defaults.
  const sent = Object.fromEntries(Object.entries(body).filter(([k]) => k in tattooFieldsSchema.shape));
  const fields = parse(tattooUpdateSchema, sent);
  const present = Object.fromEntries(Object.entries(fields).filter(([k]) => k in sent));
  const updated = await tattoos.updateTattoo(id, present, req.file?.buffer);
  res.json({ data: updated });
}

export async function deleteTattoo(req: Request, res: Response) {
  await tattoos.deleteTattoo(idParam(req));
  res.status(204).end();
}

export async function toggleFeatured(req: Request, res: Response) {
  const { isFeatured } = parse(featuredToggleSchema, req.body);
  res.json({ data: await tattoos.setFeatured(idParam(req), isFeatured) });
}

export async function reorderFeatured(req: Request, res: Response) {
  const { ids } = parse(featuredReorderSchema, req.body);
  res.json({ data: await tattoos.setFeaturedSelection(ids) });
}

export async function getSettings(_req: Request, res: Response) {
  res.json({ data: toSettingsDto(await getSettingsRow()) });
}

export async function putSettings(req: Request, res: Response) {
  const input = parse(settingsUpdateSchema, req.body);
  res.json({ data: toSettingsDto(await updateSettings(input)) });
}

export async function putPortrait(req: Request, res: Response) {
  if (!req.file) throw badRequest('Choose a photograph to upload.');
  const alt = parse(z.string().trim().max(300).optional(), (req.body as Record<string, unknown> | undefined)?.portraitAlt);
  res.json({ data: toSettingsDto(await replacePortrait(req.file.buffer, alt)) });
}

export async function deletePortrait(_req: Request, res: Response) {
  res.json({ data: toSettingsDto(await removePortrait()) });
}

export async function getEnquiries(req: Request, res: Response) {
  const status = parse(z.enum(['NEW', 'HANDLED']).optional(), req.query.status || undefined);
  res.json({ data: await listEnquiries(status) });
}

export async function patchEnquiry(req: Request, res: Response) {
  const { status } = parse(enquiryStatusSchema, req.body);
  res.json({ data: await setEnquiryStatus(idParam(req), status) });
}

export async function removeEnquiry(req: Request, res: Response) {
  await deleteEnquiry(idParam(req));
  res.status(204).end();
}
