import { env } from '../config/env.js';

export type CacheTag = 'tattoos' | 'featured' | 'settings';

/**
 * Asks the Next.js site to drop cached pages after content changes so edits appear immediately.
 * Fire-and-forget: if the site is unreachable, pages still refresh on their timed revalidation.
 */
export function revalidatePublicSite(tags: CacheTag[]) {
  if (!env.FRONTEND_REVALIDATE_URL || !env.REVALIDATE_SECRET) return;
  fetch(env.FRONTEND_REVALIDATE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': env.REVALIDATE_SECRET },
    body: JSON.stringify({ tags }),
    signal: AbortSignal.timeout(4000),
  })
    .then((r) => {
      if (!r.ok) console.warn(`[revalidate] site responded ${r.status}`);
    })
    .catch((err: Error) => console.warn(`[revalidate] could not reach site: ${err.message}`));
}
