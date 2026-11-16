import type { SiteSettings, Tattoo, TattooSize } from './types';

export const SIZE_LABEL: Record<TattooSize, string> = { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large' };
export const SIZES: TattooSize[] = ['SMALL', 'MEDIUM', 'LARGE'];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Returns null when there is no price, so callers never render ₹0 or an empty label. */
export function formatPrice(value: number | null | undefined): string | null {
  if (value === null || value === undefined || value <= 0) return null;
  return inr.format(value);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function siteName(s: Pick<SiteSettings, 'brandName' | 'artistName'>) {
  return s.brandName || s.artistName || 'Tattoo artist';
}

export function whatsappLink(number: string, message: string) {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function tattooEnquiryMessage(t: Pick<Tattoo, 'title' | 'size' | 'slug'>, siteUrl: string) {
  return [
    `Hi! I'd like to ask about a tattoo like “${t.title}” (${SIZE_LABEL[t.size].toLowerCase()}).`,
    `${siteUrl.replace(/\/$/, '')}/work/${t.slug}`,
    '',
    'My idea:',
    'Placement:',
  ].join('\n');
}

export function formatPhoneForDisplay(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.startsWith('91') && d.length === 12) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return d ? `+${d}` : '';
}

export function instagramHandle(url: string) {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/);
  return m ? `@${m[1]}` : url;
}

export function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function firstSentences(text: string, max = 320) {
  const p = paragraphs(text)[0] ?? '';
  if (p.length <= max) return p;
  const cut = p.slice(0, max);
  const end = cut.lastIndexOf('. ');
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}
