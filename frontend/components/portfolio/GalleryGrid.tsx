import { Reveal } from '@/components/ui/Reveal';
import type { Tattoo } from '@/lib/types';
import { GalleryCard } from './GalleryCard';
import { placement } from './layout';

export function GalleryGrid({ items, offset = 0, eagerCount = 0 }: { items: Tattoo[]; offset?: number; eagerCount?: number }) {
  return (
    <ul className="page-grid gap-y-12 md:gap-y-16 lg:gap-y-20">
      {items.map((t, i) => {
        const n = offset + i;
        const p = placement(n);
        return (
          <li key={t.id} className={p.cell}>
            <Reveal>
              <GalleryCard tattoo={t} number={n + 1} aspect={p.aspect} sizes={p.sizes} showPrice eager={n < eagerCount} />
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}
