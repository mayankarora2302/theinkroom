import type { Enquiry, EnquiryStatus } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../utils/http-error.js';
import type { enquirySchema } from '../validators/enquiry.js';

type EnquiryInput = z.output<typeof enquirySchema>;

export async function createEnquiry(input: EnquiryInput) {
  let tattoo: { id: string; title: string } | null = null;
  if (input.tattooSlug) {
    tattoo = await prisma.tattoo.findFirst({
      where: { slug: input.tattooSlug, isPublished: true },
      select: { id: true, title: true },
    });
  }
  const created = await prisma.enquiry.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      idea: input.idea,
      preferredSize: input.preferredSize && input.preferredSize !== 'UNSURE' ? input.preferredSize : null,
      placement: input.placement,
      contactMethod: input.contactMethod,
      tattooId: tattoo?.id ?? null,
      tattooTitle: tattoo?.title ?? null,
    },
  });
  return { id: created.id, createdAt: created.createdAt };
}

const toDto = (e: Enquiry & { tattoo?: { slug: string } | null }) => ({
  id: e.id,
  name: e.name,
  phone: e.phone,
  email: e.email,
  idea: e.idea,
  preferredSize: e.preferredSize,
  placement: e.placement,
  contactMethod: e.contactMethod,
  tattooTitle: e.tattooTitle,
  tattooSlug: e.tattoo?.slug ?? null,
  status: e.status,
  createdAt: e.createdAt,
});

export async function listEnquiries(status?: EnquiryStatus) {
  const items = await prisma.enquiry.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { tattoo: { select: { slug: true } } },
  });
  return items.map(toDto);
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  const exists = await prisma.enquiry.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('That enquiry no longer exists.');
  const updated = await prisma.enquiry.update({ where: { id }, data: { status }, include: { tattoo: { select: { slug: true } } } });
  return toDto(updated);
}

export async function deleteEnquiry(id: string) {
  const { count } = await prisma.enquiry.deleteMany({ where: { id } });
  if (!count) throw notFound('That enquiry no longer exists.');
}
