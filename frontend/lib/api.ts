import { connection } from 'next/server';
import type { PortfolioMeta, SiteSettings, Tattoo, TattooDetail } from './types';

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const REVALIDATE_SECONDS = 120;

export class ApiUnavailableError extends Error {}

/**
 * Server-side reads from the public API. Pages render per request, while the responses
 * themselves sit in Next's data cache under tags the API invalidates after admin edits.
 */
async function get<T>(path: string, tags: string[]): Promise<{ status: number; body: T | null }> {
  await connection();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/v1/public${path}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags },
      headers: { accept: 'application/json' },
    });
  } catch (err) {
    throw new ApiUnavailableError(`The portfolio API is not reachable (${(err as Error).message}).`);
  }
  if (res.status === 404) return { status: 404, body: null };
  if (!res.ok) throw new ApiUnavailableError(`The portfolio API responded with ${res.status}.`);
  return { status: res.status, body: (await res.json()) as T };
}

export const FALLBACK_SETTINGS: SiteSettings = {
  artistName: '',
  brandName: 'The Ink Room',
  tagline: '',
  homepageIntroduction: '',
  biography: '',
  philosophy: '',
  experience: '',
  styles: [],
  phone: '',
  whatsappNumber: '',
  instagramUrl: '',
  contactEmail: '',
  location: '',
  portrait: null,
  processSteps: [],
  faqs: [],
  updatedAt: new Date(0).toISOString(),
};

/** Settings never take the whole site down: the shell falls back to neutral defaults. */
export async function getSettings(): Promise<SiteSettings> {
  // Outside the try: Next uses a thrown signal here to mark the route as dynamic.
  await connection();
  try {
    const { body } = await get<{ data: SiteSettings }>('/settings', ['settings']);
    return body?.data ?? FALLBACK_SETTINGS;
  } catch (err) {
    console.error('[site] settings unavailable:', (err as Error).message);
    return FALLBACK_SETTINGS;
  }
}

export async function getFeatured(): Promise<Tattoo[]> {
  const { body } = await get<{ data: Tattoo[] }>('/featured', ['featured', 'tattoos']);
  return body?.data ?? [];
}

export async function getPortfolio(params: { page?: number; limit?: number; size?: string; q?: string; exclude?: string }) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.size) qs.set('size', params.size);
  if (params.q) qs.set('q', params.q);
  if (params.exclude) qs.set('exclude', params.exclude);
  const { body } = await get<{ data: Tattoo[]; meta: PortfolioMeta }>(`/tattoos?${qs}`, ['tattoos']);
  return body ?? { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 1, hasMore: false, counts: { ALL: 0, SMALL: 0, MEDIUM: 0, LARGE: 0 } } };
}

export async function getTattoo(slug: string): Promise<TattooDetail | null> {
  const { body } = await get<{ data: TattooDetail }>(`/tattoos/${encodeURIComponent(slug)}`, ['tattoos']);
  return body?.data ?? null;
}

export async function getSlugs(): Promise<Array<{ slug: string; updatedAt: string }>> {
  await connection();
  try {
    const { body } = await get<{ data: Array<{ slug: string; updatedAt: string }> }>('/slugs', ['tattoos']);
    return body?.data ?? [];
  } catch {
    return [];
  }
}
