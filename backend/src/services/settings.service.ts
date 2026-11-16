import type { Prisma, SiteSettings } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import type { SettingsUpdate } from '../validators/settings.js';
import { processImage } from './image.service.js';
import { revalidatePublicSite } from './revalidate.service.js';
import { DEFAULT_FAQS, DEFAULT_INTRODUCTION, DEFAULT_PROCESS_STEPS } from './settings-defaults.js';
import { storage } from './storage.service.js';

const SETTINGS_ID = 1;

export async function getSettingsRow(): Promise<SiteSettings> {
  const existing = await prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID, homepageIntroduction: DEFAULT_INTRODUCTION, processSteps: DEFAULT_PROCESS_STEPS, faqs: DEFAULT_FAQS },
  });
}

type Step = { title: string; body: string };
type Faq = { question: string; answer: string };
const asArray = <T>(v: Prisma.JsonValue): T[] => (Array.isArray(v) ? (v as unknown as T[]) : []);

export function toSettingsDto(s: SiteSettings) {
  return {
    artistName: s.artistName,
    brandName: s.brandName,
    tagline: s.tagline,
    homepageIntroduction: s.homepageIntroduction,
    biography: s.biography,
    philosophy: s.philosophy,
    experience: s.experience,
    styles: s.styles,
    phone: s.phone,
    whatsappNumber: s.whatsappNumber,
    instagramUrl: s.instagramUrl,
    contactEmail: s.contactEmail,
    location: s.location,
    portrait:
      s.portraitPath && s.portraitWidth && s.portraitHeight
        ? { url: storage.publicUrl(s.portraitPath), width: s.portraitWidth, height: s.portraitHeight, alt: s.portraitAlt }
        : null,
    processSteps: asArray<Step>(s.processSteps),
    faqs: asArray<Faq>(s.faqs),
    featuredLimit: s.featuredLimit,
    updatedAt: s.updatedAt,
  };
}

export async function updateSettings(input: SettingsUpdate) {
  await getSettingsRow();
  const updated = await prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data: input });
  revalidatePublicSite(['settings', 'featured']);
  return updated;
}

export async function replacePortrait(file: Buffer, alt?: string) {
  const current = await getSettingsRow();
  const img = await processImage(file, { maxEdge: 1800, thumbEdge: 400 });
  const objectPath = `site/portrait-${randomUUID()}.webp`;
  await storage.upload(objectPath, img.full, 'image/webp');
  const updated = await prisma.siteSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      portraitPath: objectPath,
      portraitWidth: img.width,
      portraitHeight: img.height,
      ...(alt !== undefined ? { portraitAlt: alt.slice(0, 300) } : {}),
    },
  });
  if (current.portraitPath) await storage.remove([current.portraitPath]);
  revalidatePublicSite(['settings']);
  return updated;
}

export async function removePortrait() {
  const current = await getSettingsRow();
  const updated = await prisma.siteSettings.update({
    where: { id: SETTINGS_ID },
    data: { portraitPath: null, portraitWidth: null, portraitHeight: null },
  });
  if (current.portraitPath) await storage.remove([current.portraitPath]);
  revalidatePublicSite(['settings']);
  return updated;
}
