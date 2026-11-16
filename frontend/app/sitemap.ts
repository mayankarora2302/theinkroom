import type { MetadataRoute } from 'next';
import { getSlugs } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getSlugs();
  const pages: MetadataRoute.Sitemap = ['', '/work', '/about', '/process', '/contact'].map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === '/work' || p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.7,
  }));
  return [
    ...pages,
    ...slugs.map((s) => ({ url: `${SITE_URL}/work/${s.slug}`, lastModified: s.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
