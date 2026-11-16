import type { Metadata } from 'next';
import Link from 'next/link';
import { PortfolioGallery } from '@/components/portfolio/PortfolioGallery';
import { SearchBox } from '@/components/portfolio/SearchBox';
import { getPortfolio, getSettings } from '@/lib/api';
import { SIZE_LABEL, SIZES, siteName } from '@/lib/format';
import type { TattooSize } from '@/lib/types';

type SearchParams = Promise<{ size?: string; q?: string }>;

const PAGE_SIZE = 12;

function parseSize(v?: string): TattooSize | undefined {
  const up = v?.toUpperCase();
  return SIZES.includes(up as TattooSize) ? (up as TattooSize) : undefined;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const [{ size }, settings] = await Promise.all([searchParams, getSettings()]);
  const s = parseSize(size);
  const title = s ? `${SIZE_LABEL[s]} tattoos` : 'Work';
  return {
    title,
    description: `${s ? `${SIZE_LABEL[s]} pieces` : 'The full tattoo portfolio'} by ${settings.artistName || siteName(settings)}.`,
    alternates: { canonical: s ? `/work?size=${s.toLowerCase()}` : '/work' },
  };
}

export default async function WorkPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const size = parseSize(params.size);
  const q = params.q?.trim().slice(0, 80) || undefined;
  const { data, meta } = await getPortfolio({ limit: PAGE_SIZE, size, q });
  const filtered = Boolean(size || q);

  const href = (s?: TattooSize) => {
    const qs = new URLSearchParams();
    if (s) qs.set('size', s.toLowerCase());
    if (q) qs.set('q', q);
    const str = qs.toString();
    return str ? `/work?${str}` : '/work';
  };

  const tabs: Array<{ key: TattooSize | undefined; label: string; count: number }> = [
    { key: undefined, label: 'All', count: meta.counts.ALL },
    ...SIZES.map((s) => ({ key: s, label: SIZE_LABEL[s], count: meta.counts[s] })),
  ];

  return (
    <div className="gutter pt-28 pb-24 md:pt-40 md:pb-36">
      <header className="page-grid gap-y-8 pb-12 md:pb-16">
        <h1 className="text-display-xl col-span-12 text-bone lg:col-span-7">
          Work<sup className="text-meta ml-3 align-top font-sans text-mute tabular-nums">({meta.counts.ALL})</sup>
        </h1>
        <p className="col-span-12 max-w-[40ch] self-end text-lede text-bone-2 lg:col-span-4 lg:col-start-9">
          Select a piece to see its size, placement and estimated price. Filter by size to find work close to what you have in mind.
        </p>
      </header>

      <div className="sticky top-16 z-20 -mx-[clamp(1rem,0.5rem+3vw,3.5rem)] mb-12 border-y border-line bg-ink/95 px-[clamp(1rem,0.5rem+3vw,3.5rem)] md:top-[4.5rem] md:mb-20">
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Filter by size" className="-mx-1 flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = t.key === size;
              return (
                <Link
                  key={t.label}
                  href={href(t.key)}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-[0.9375rem] transition-colors ${
                    active ? 'text-bone' : 'text-mute hover:text-bone'
                  }`}
                >
                  <span className={active ? 'link-line' : ''}>{t.label}</span>
                  <span className="text-meta tabular-nums opacity-70">{t.count}</span>
                </Link>
              );
            })}
            {filtered && (
              <Link href="/work" scroll={false} className="text-meta ml-2 inline-flex h-10 shrink-0 items-center px-2 text-accent-strong hover:text-bone">
                Reset
              </Link>
            )}
          </nav>
          <SearchBox defaultValue={q ?? ''} size={size?.toLowerCase()} />
        </div>
      </div>

      {data.length > 0 ? (
        <PortfolioGallery key={`${size ?? 'all'}-${q ?? ''}`} initialItems={data} initialMeta={meta} size={size?.toLowerCase()} q={q} />
      ) : (
        <div className="flex min-h-[40vh] flex-col items-start justify-center border-t border-line py-16">
          <p className="text-display-m max-w-[20ch] text-bone">
            {filtered ? 'Nothing matches that just yet.' : 'The portfolio is being prepared.'}
          </p>
          <p className="mt-4 max-w-[48ch] text-bone-2">
            {filtered
              ? 'Try another size, or clear the search to see everything.'
              : 'New work will be added here soon. In the meantime, you are welcome to get in touch about an idea.'}
          </p>
          <Link href={filtered ? '/work' : '/contact'} className="link-line mt-8 text-bone">
            {filtered ? 'Show all work' : 'Start an enquiry'}
          </Link>
        </div>
      )}
    </div>
  );
}
