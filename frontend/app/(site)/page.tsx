import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FeaturedCarousel } from '@/components/carousel/FeaturedCarousel';
import { GalleryGrid } from '@/components/portfolio/GalleryGrid';
import { ArrowLink } from '@/components/ui/ArrowLink';
import { Reveal } from '@/components/ui/Reveal';
import { Portrait } from '@/components/ui/Portrait';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { getFeatured, getPortfolio, getSettings } from '@/lib/api';
import { firstSentences, pad2, siteName, whatsappLink } from '@/lib/format';
import type { SiteSettings, Tattoo } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const [featured, latest] = await Promise.all([getFeatured().catch(() => []), getPortfolio({ limit: 1 }).catch(() => null)]);
  const cover = featured[0] ?? latest?.data[0];
  return {
    alternates: { canonical: '/' },
    ...(cover ? { openGraph: { images: [{ url: cover.image.url, width: cover.image.width, height: cover.image.height, alt: cover.image.alt }] } } : {}),
  };
}

export default async function HomePage() {
  const [settings, featured, latest] = await Promise.all([getSettings(), getFeatured(), getPortfolio({ limit: 5 })]);
  const name = siteName(settings);
  const whatsappUrl = settings.whatsappNumber ? whatsappLink(settings.whatsappNumber, 'Hi! I’d like to talk about a tattoo idea.') : null;

  return (
    <>
      <Hero settings={settings} featured={featured} fallbackImage={latest.data[0]} name={name} />
      {latest.data.length > 0 && <SelectedWork items={latest.data} total={latest.meta.total} />}
      <AboutTeaser settings={settings} name={name} />
      {settings.processSteps.length > 0 && <Approach settings={settings} />}
      <Consultation whatsappUrl={whatsappUrl} />
    </>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function HeroIntro({ settings, name }: { settings: SiteSettings; name: string }) {
  const kicker = [settings.artistName && settings.artistName !== name ? settings.artistName : 'Independent tattoo artist', settings.location]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <p className="text-meta text-mute">{kicker}</p>
      <h1 className="text-display-xl mt-5 text-bone md:mt-7">{name}</h1>
      {settings.tagline && (
        <p className="mt-6 max-w-[22ch] font-display text-[1.5rem] leading-[1.2] text-bone-2 italic md:text-[1.75rem]">
          {settings.tagline}
        </p>
      )}
      {settings.homepageIntroduction && (
        <p className="text-lede mt-6 max-w-[40ch] whitespace-pre-line text-bone-2">{settings.homepageIntroduction}</p>
      )}
      <div className="mt-9 flex flex-wrap gap-3 md:mt-11">
        <ArrowLink href="/work">Explore the work</ArrowLink>
        <ArrowLink href="/contact" variant="outline">
          Enquire about a tattoo
        </ArrowLink>
      </div>
    </>
  );
}

function Hero({ settings, featured, fallbackImage, name }: { settings: SiteSettings; featured: Tattoo[]; fallbackImage?: Tattoo; name: string }) {
  // 1. Featured carousel (artist-curated)  2. latest published piece  3. purely typographic.
  if (featured.length === 0 && !fallbackImage) {
    return (
      <section className="gutter flex min-h-[88svh] flex-col justify-end pt-28 pb-16 md:pb-24">
        <div className="max-w-5xl">
          <HeroIntro settings={settings} name={name} />
        </div>
        <div className="text-meta mt-16 flex justify-between border-t border-line pt-5 text-mute">
          <span>Portfolio</span>
          <span>New work is being photographed</span>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-16 md:pt-[4.5rem]">
      <div className="gutter page-grid gap-y-10 pt-8 pb-20 md:pt-12 lg:min-h-[calc(100svh-4.5rem)] lg:pt-14 lg:pb-14">
        <div className="col-span-12 flex flex-col lg:col-span-5 lg:pt-6">
          <HeroIntro settings={settings} name={name} />
          <p className="text-meta mt-auto hidden items-center gap-3 pt-16 text-mute lg:flex">
            <span className="h-px w-10 bg-line-strong" aria-hidden />
            {featured.length > 0 ? 'Featured work' : 'Latest work'}
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7 lg:col-start-6">
          {featured.length > 0 ? (
            <FeaturedCarousel items={featured} stageClassName="aspect-[4/5] sm:aspect-[5/4] lg:aspect-auto lg:h-[calc(100svh-17.5rem)] lg:min-h-[28rem]" />
          ) : (
            fallbackImage && (
              <Link href={`/work/${fallbackImage.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-ink-3 sm:aspect-[5/4] lg:aspect-auto lg:h-[calc(100svh-17.5rem)] lg:min-h-[28rem]">
                  <Image
                    src={fallbackImage.image.url}
                    alt={fallbackImage.image.alt}
                    fill
                    preload
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    quality={82}
                    placeholder={fallbackImage.image.blurDataUrl ? 'blur' : 'empty'}
                    blurDataURL={fallbackImage.image.blurDataUrl || undefined}
                    className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.02]"
                  />
                </div>
                <p className="text-display-s mt-4 text-bone">{fallbackImage.title}</p>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Selected work ─────────────────────────── */

function SelectedWork({ items, total }: { items: Tattoo[]; total: number }) {
  return (
    <section aria-labelledby="selected-work" className="gutter border-t border-line py-24 md:py-36">
      <div className="page-grid mb-14 gap-y-6 md:mb-24">
        <SectionLabel n={1} className="col-span-12 lg:col-span-2">
          Selected work
        </SectionLabel>
        <h2 id="selected-work" className="text-display-l col-span-12 max-w-[12ch] text-bone lg:col-span-6">
          Recent pieces from the studio
        </h2>
        <div className="col-span-12 flex flex-col justify-end gap-5 lg:col-span-3 lg:col-start-10">
          <p className="max-w-[34ch] text-bone-2">Each piece is drawn for one person and one placement. The full portfolio can be filtered by size.</p>
          <Link href="/work" className="link-line w-fit text-bone">
            View all {total} pieces
          </Link>
        </div>
      </div>
      <GalleryGrid items={items} />
    </section>
  );
}

/* ─────────────────────────── About teaser ─────────────────────────── */

function AboutTeaser({ settings, name }: { settings: SiteSettings; name: string }) {
  const who = settings.artistName || name;
  const intro = firstSentences(settings.biography, 360);
  return (
    <section aria-labelledby="about-artist" className="border-t border-line bg-ink-2">
      <div className="gutter page-grid gap-y-12 py-24 md:py-36">
        <Reveal className="col-span-12 md:col-span-6 lg:col-span-5">
          <Portrait settings={settings} who={who} />
        </Reveal>
        <div className="col-span-12 flex flex-col md:col-span-6 lg:col-span-5 lg:col-start-8">
          <SectionLabel n={2}>The artist</SectionLabel>
          <h2 id="about-artist" className="text-display-l mt-8 text-bone">
            {who}
          </h2>
          {settings.philosophy && (
            <p className="mt-8 font-display text-[1.5rem] leading-[1.3] text-bone-2 italic md:text-[1.75rem]">
              {firstSentences(settings.philosophy, 200)}
            </p>
          )}
          <p className="mt-8 max-w-[52ch] text-bone-2">
            {intro || 'A short introduction to the artist will appear here once it has been added in the studio settings.'}
          </p>
          <ArrowLink href="/about" variant="text" className="mt-10 w-fit">
            More about {settings.artistName ? settings.artistName.split(' ')[0] : 'the artist'}
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Approach ─────────────────────────── */

function Approach({ settings }: { settings: SiteSettings }) {
  const steps = settings.processSteps.slice(0, 4);
  return (
    <section aria-labelledby="approach" className="gutter border-t border-line py-24 md:py-36">
      <div className="page-grid gap-y-8">
        <SectionLabel n={3} className="col-span-12 lg:col-span-2">
          The approach
        </SectionLabel>
        <h2 id="approach" className="text-display-l col-span-12 max-w-[16ch] text-bone lg:col-span-8">
          Custom work, drawn for the body it lives on
        </h2>
      </div>
      <ol className="page-grid mt-16 gap-y-10 md:mt-24">
        {steps.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 80} className="col-span-12 border-t border-line-strong pt-6 sm:col-span-6 lg:col-span-3">
            <p className="text-meta text-accent tabular-nums">{pad2(i + 1)}</p>
            <h3 className="text-display-s mt-6 text-bone">{step.title}</h3>
            <p className="mt-4 max-w-[38ch] text-[0.9375rem] text-bone-2">{step.body}</p>
          </Reveal>
        ))}
      </ol>
      <Link href="/process" className="link-line mt-14 inline-block text-bone md:mt-20">
        The full process and frequently asked questions
      </Link>
    </section>
  );
}

/* ─────────────────────────── Consultation ─────────────────────────── */

function Consultation({ whatsappUrl }: { whatsappUrl: string | null }) {
  return (
    <section aria-labelledby="consult" className="gutter border-t border-line py-24 md:py-40">
      <div className="page-grid gap-y-10">
        <SectionLabel n={4} className="col-span-12 lg:col-span-2">
          Consultation
        </SectionLabel>
        <div className="col-span-12 lg:col-span-10">
          <h2 id="consult" className="text-display-xl max-w-[13ch] text-bone">
            Tell me about the piece you have in mind.
          </h2>
          <div className="mt-12 flex flex-col gap-8 md:mt-16 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[44ch] text-lede text-bone-2">
              A rough idea is enough to start. Share the subject, the placement and a sense of scale, and we will shape it from there.
            </p>
            <div className="flex flex-wrap gap-3">
              {whatsappUrl && (
                <ArrowLink href={whatsappUrl} external>
                  Message on WhatsApp
                </ArrowLink>
              )}
              <ArrowLink href="/contact" variant={whatsappUrl ? 'outline' : 'solid'}>
                Send an enquiry
              </ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
