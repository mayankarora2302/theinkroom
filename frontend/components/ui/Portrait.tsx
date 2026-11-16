import Image from 'next/image';
import type { SiteSettings } from '@/lib/types';

export function Portrait({ settings, who, preload }: { settings: SiteSettings; who: string; preload?: boolean }) {
  if (settings.portrait) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-3">
        <Image
          src={settings.portrait.url}
          alt={settings.portrait.alt || `Portrait of ${who}`}
          fill
          preload={preload}
          sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
          quality={82}
          className="object-cover"
        />
      </div>
    );
  }
  // Neutral, clearly replaceable stand-in until a portrait is uploaded.
  return (
    <div className="relative flex aspect-[4/5] items-end overflow-hidden border border-line bg-ink-3 p-6" role="img" aria-label="Portrait coming soon">
      <span aria-hidden className="pointer-events-none absolute -top-[0.18em] -right-[0.04em] font-display text-[22rem] leading-none text-line select-none">
        {who.charAt(0)}
      </span>
      <span className="text-meta relative text-mute">Portrait to follow</span>
    </div>
  );
}
