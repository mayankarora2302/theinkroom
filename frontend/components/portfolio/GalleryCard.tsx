import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, pad2, SIZE_LABEL } from '@/lib/format';
import type { Tattoo } from '@/lib/types';

interface Props {
  tattoo: Tattoo;
  number?: number;
  aspect?: string;
  sizes?: string;
  showPrice?: boolean;
  eager?: boolean;
}

/** A single portfolio piece: photograph, number, title and size. Nothing depends on hover. */
export function GalleryCard({ tattoo, number, aspect = 'aspect-[4/5]', sizes = '(min-width: 1024px) 33vw, 50vw', showPrice, eager }: Props) {
  const price = showPrice ? formatPrice(tattoo.estimatedPrice) : null;
  return (
    <Link href={`/work/${tattoo.slug}`} className="group block">
      <div className={`relative overflow-hidden bg-ink-3 ${aspect}`}>
        <Image
          src={tattoo.image.thumbUrl}
          alt={tattoo.image.alt}
          fill
          sizes={sizes}
          quality={82}
          placeholder={tattoo.image.blurDataUrl ? 'blur' : 'empty'}
          blurDataURL={tattoo.image.blurDataUrl || undefined}
          loading={eager ? 'eager' : 'lazy'}
          className="object-cover transition-[transform,filter] duration-700 ease-out-soft group-hover:scale-[1.025] group-hover:brightness-[1.06]"
        />
      </div>
      <div className="mt-3 flex items-baseline gap-3 md:mt-4">
        {number !== undefined && <span className="text-meta shrink-0 text-accent tabular-nums">{pad2(number)}</span>}
        <h3 className="min-w-0 flex-1 truncate font-display text-[1.25rem] leading-tight text-bone md:text-[1.375rem]">
          <span className="link-draw">{tattoo.title}</span>
        </h3>
        <span className="text-meta shrink-0 text-mute">
          {SIZE_LABEL[tattoo.size]}
          {price && <span className="hidden sm:inline"> · {price}</span>}
        </span>
      </div>
    </Link>
  );
}
