import type { Metadata } from 'next';
import { ArrowLink } from '@/components/ui/ArrowLink';
import { Portrait } from '@/components/ui/Portrait';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { getSettings } from '@/lib/api';
import { firstSentences, paragraphs, siteName, whatsappLink } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const who = s.artistName || siteName(s);
  return {
    title: 'About',
    description: firstSentences(s.biography, 155) || `About ${who}, independent tattoo artist.`,
    alternates: { canonical: '/about' },
  };
}

export default async function AboutPage() {
  const s = await getSettings();
  const name = siteName(s);
  const who = s.artistName || name;
  const bio = paragraphs(s.biography);
  const wa = s.whatsappNumber ? whatsappLink(s.whatsappNumber, 'Hi! I’d like to book a consultation.') : null;

  return (
    <div className="pt-28 md:pt-40">
      <header className="gutter page-grid gap-y-6 pb-14 md:pb-24">
        <SectionLabel className="col-span-12 lg:col-span-2">About</SectionLabel>
        <h1 className="text-display-xl col-span-12 text-bone lg:col-span-10">{who}</h1>
        {s.tagline && (
          <p className="col-span-12 max-w-[30ch] font-display text-[1.5rem] leading-[1.25] text-bone-2 italic md:text-[2rem] lg:col-span-8 lg:col-start-3">
            {s.tagline}
          </p>
        )}
      </header>

      <div className="gutter page-grid gap-y-14 border-t border-line pt-14 pb-24 md:pt-20 md:pb-36">
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <div className="md:sticky md:top-28">
            <Portrait settings={s} who={who} preload />
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-6 lg:col-start-7">
          <section aria-labelledby="bio">
            <h2 id="bio" className="text-meta text-mute">
              Biography
            </h2>
            {bio.length ? (
              <div className="mt-6 space-y-5 text-lede text-bone-2">
                {bio.map((p, i) => (
                  <p key={i} className={i === 0 ? 'text-bone' : undefined}>
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-lede text-mute">The artist’s biography will appear here.</p>
            )}
          </section>

          {s.philosophy && (
            <section aria-labelledby="philosophy" className="mt-16 border-t border-line pt-10 md:mt-24">
              <h2 id="philosophy" className="text-meta text-mute">
                Philosophy
              </h2>
              <blockquote className="mt-6 space-y-5">
                {paragraphs(s.philosophy).map((p, i) => (
                  <p key={i} className={i === 0 ? 'text-display-m text-bone' : 'text-bone-2'}>
                    {p}
                  </p>
                ))}
              </blockquote>
            </section>
          )}

          {(s.styles.length > 0 || s.experience) && (
            <section aria-labelledby="practice" className="mt-16 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 md:mt-24">
              <h2 id="practice" className="sr-only">
                Practice
              </h2>
              {s.styles.length > 0 && (
                <div>
                  <h3 className="text-meta text-mute">Styles</h3>
                  <ul className="mt-5 space-y-2">
                    {s.styles.map((style) => (
                      <li key={style} className="font-display text-[1.5rem] leading-tight text-bone">
                        {style}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {s.experience && (
                <div>
                  <h3 className="text-meta text-mute">Experience &amp; specialties</h3>
                  <div className="mt-5 space-y-4 text-bone-2">
                    {paragraphs(s.experience).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {s.location && (
            <section aria-labelledby="studio" className="mt-16 border-t border-line pt-10 md:mt-24">
              <h2 id="studio" className="text-meta text-mute">
                Studio
              </h2>
              <p className="mt-5 whitespace-pre-line text-lede text-bone">{s.location}</p>
            </section>
          )}

          <div className="mt-16 flex flex-wrap gap-3 border-t border-line pt-10 md:mt-24">
            <ArrowLink href="/contact">Book a consultation</ArrowLink>
            {wa && (
              <ArrowLink href={wa} external variant="outline">
                WhatsApp
              </ArrowLink>
            )}
            <ArrowLink href="/work" variant="text" className="px-2">
              See the work
            </ArrowLink>
          </div>
        </div>
      </div>
    </div>
  );
}
