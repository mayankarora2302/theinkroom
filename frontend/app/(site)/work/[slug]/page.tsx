import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GalleryCard } from '@/components/portfolio/GalleryCard';
import { ArrowLink } from '@/components/ui/ArrowLink';
import { getSettings, getTattoo } from '@/lib/api';
import { formatPrice, paragraphs, SIZE_LABEL, siteName, tattooEnquiryMessage, whatsappLink } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getTattoo(slug), getSettings()]);
  if (!detail) return { title: 'Not found', robots: { index: false } };
  const t = detail.tattoo;
  const by = settings.artistName || siteName(settings);
  const description =
    (t.description && t.description.slice(0, 155)) ||
    `${SIZE_LABEL[t.size]} ${t.style ? `${t.style.toLowerCase()} ` : ''}tattoo${t.placement ? ` on the ${t.placement.toLowerCase()}` : ''} by ${by}.`;
  return {
    title: t.title,
    description,
    alternates: { canonical: `/work/${t.slug}` },
    openGraph: {
      type: 'article',
      title: t.title,
      description,
      url: `/work/${t.slug}`,
      images: [{ url: t.image.url, width: t.image.width, height: t.image.height, alt: t.image.alt }],
    },
  };
}

export default async function TattooPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getTattoo(slug), getSettings()]);
  if (!detail) notFound();
  const { tattoo: t, previous, next, related } = detail;
  const price = formatPrice(t.estimatedPrice);
  const wa = settings.whatsappNumber ? whatsappLink(settings.whatsappNumber, tattooEnquiryMessage(t, SITE_URL)) : null;
  const portrait = t.image.height >= t.image.width;

  const facts = [
    { label: 'Size', value: SIZE_LABEL[t.size] },
    t.placement && { label: 'Placement', value: t.placement },
    t.style && { label: 'Style', value: t.style },
    price && { label: 'Estimated price', value: `From ${price}` },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: t.title,
    artform: 'Tattoo',
    url: `${SITE_URL}/work/${t.slug}`,
    image: t.image.url,
    ...(t.description ? { description: t.description } : {}),
    ...(t.style ? { artMedium: t.style } : {}),
    ...(settings.artistName ? { creator: { '@type': 'Person', name: settings.artistName } } : {}),
    dateCreated: t.createdAt,
  };

  return (
    <article className="pt-20 md:pt-[6.5rem]">
      <div className="gutter">
        <nav aria-label="Breadcrumb" className="text-meta flex items-center gap-2 py-4 text-mute md:py-6">
          <Link href="/work" className="link-draw hover:text-bone">
            Work
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/work?size=${t.size.toLowerCase()}`} className="link-draw hover:text-bone">
            {SIZE_LABEL[t.size]}
          </Link>
        </nav>

        <div className="page-grid gap-y-10">
          <figure className={`col-span-12 ${portrait ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
            <div className="bg-ink-3">
              <Image
                src={t.image.url}
                alt={t.image.alt}
                width={t.image.width}
                height={t.image.height}
                preload
                quality={82}
                sizes={portrait ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 1024px) 66vw, 100vw'}
                placeholder={t.image.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={t.image.blurDataUrl || undefined}
                className="mx-auto h-auto max-h-[88svh] w-auto max-w-full object-contain"
              />
            </div>
          </figure>

          <div className={`col-span-12 ${portrait ? 'lg:col-span-4 lg:col-start-9' : 'lg:col-span-4 lg:col-start-9'}`}>
            <div className="lg:sticky lg:top-28">
              <h1 className="text-display-l text-bone">{t.title}</h1>

              {t.description && (
                <div className="mt-8 space-y-4 text-bone-2">
                  {paragraphs(t.description).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              <dl className="mt-10 border-t border-line">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                    <dt className="text-meta text-mute">{f.label}</dt>
                    <dd className="text-right text-bone">{f.value}</dd>
                  </div>
                ))}
              </dl>
              {price && (
                <p className="text-meta mt-4 text-mute">
                  Estimates are a starting point. The final price depends on the design’s complexity, placement and size, and is
                  confirmed at consultation.
                </p>
              )}

              <div className="mt-10 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                {wa && (
                  <ArrowLink href={wa} external className="flex-1">
                    Enquire on WhatsApp
                  </ArrowLink>
                )}
                <ArrowLink href={`/contact?tattoo=${encodeURIComponent(t.slug)}`} variant={wa ? 'outline' : 'solid'} className="flex-1">
                  {wa ? 'Send an enquiry' : 'Enquire about this tattoo'}
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>

        {(previous || next) && (
          <nav aria-label="More pieces" className="mt-20 grid grid-cols-2 border-y border-line md:mt-28">
            <div className="border-r border-line py-6 pr-4">
              {previous && (
                <Link href={`/work/${previous.slug}`} className="group flex flex-col gap-2">
                  <span className="text-meta inline-flex items-center gap-2 text-mute">
                    <ArrowLeft size={14} strokeWidth={1.5} aria-hidden /> Newer
                  </span>
                  <span className="text-display-s truncate text-bone group-hover:text-accent-strong">{previous.title}</span>
                </Link>
              )}
            </div>
            <div className="py-6 pl-4 text-right">
              {next && (
                <Link href={`/work/${next.slug}`} className="group flex flex-col items-end gap-2">
                  <span className="text-meta inline-flex items-center gap-2 text-mute">
                    Older <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className="text-display-s max-w-full truncate text-bone group-hover:text-accent-strong">{next.title}</span>
                </Link>
              )}
            </div>
          </nav>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related" className="py-20 md:py-28">
            <div className="mb-10 flex items-end justify-between gap-6 md:mb-14">
              <h2 id="related" className="text-display-m text-bone">
                More work
              </h2>
              <Link href="/work" className="link-line shrink-0 text-bone">
                Full portfolio
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
              {related.map((r) => (
                <li key={r.id}>
                  <GalleryCard tattoo={r} aspect="aspect-[4/5]" sizes="(min-width: 1024px) 24vw, 50vw" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </article>
  );
}
