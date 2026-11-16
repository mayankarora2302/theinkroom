'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { PortfolioMeta, Tattoo } from '@/lib/types';
import { GalleryGrid } from './GalleryGrid';

interface Props {
  initialItems: Tattoo[];
  initialMeta: PortfolioMeta;
  size?: string;
  q?: string;
}

/** Server-rendered first page with a "Load more" that fetches further pages on demand. */
export function PortfolioGallery({ initialItems, initialMeta, size, q }: Props) {
  const [items, setItems] = useState(initialItems);
  const [meta, setMeta] = useState(initialMeta);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function loadMore() {
    setState('loading');
    const qs = new URLSearchParams({ page: String(meta.page + 1), limit: String(meta.limit) });
    if (size) qs.set('size', size);
    if (q) qs.set('q', q);
    try {
      const res = await fetch(`/api/v1/public/tattoos?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data: Tattoo[]; meta: PortfolioMeta };
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...body.data.filter((t) => !seen.has(t.id))];
      });
      setMeta(body.meta);
      setState('idle');
    } catch {
      setState('error');
    }
  }

  const remaining = Math.max(0, meta.total - items.length);

  return (
    <>
      <GalleryGrid items={items} eagerCount={2} />
      <div className="mt-20 flex flex-col items-center gap-3 border-t border-line pt-10 text-center md:mt-28">
        <p className="text-meta text-mute" aria-live="polite">
          Showing {items.length} of {meta.total}
        </p>
        {meta.hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={state === 'loading'}
            className="inline-flex h-12 min-w-48 items-center justify-center gap-2 border border-line-strong px-6 text-[0.9375rem] font-medium text-bone transition-colors hover:border-bone disabled:opacity-60"
          >
            {state === 'loading' ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden /> Loading
              </>
            ) : (
              `Load ${Math.min(remaining, meta.limit)} more`
            )}
          </button>
        )}
        {state === 'error' && <p className="text-meta text-bone-2">That didn’t load. Check your connection and try again.</p>}
      </div>
    </>
  );
}
