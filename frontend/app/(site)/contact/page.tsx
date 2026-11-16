import { ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { getSettings, getTattoo } from '@/lib/api';
import { formatPhoneForDisplay, instagramHandle, SIZE_LABEL, whatsappLink } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Enquire about a custom tattoo or book a consultation.',
  alternates: { canonical: '/contact' },
};

type SearchParams = Promise<{ tattoo?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const { tattoo: slug } = await searchParams;
  const [s, detail] = await Promise.all([getSettings(), slug ? getTattoo(slug.slice(0, 120)).catch(() => null) : Promise.resolve(null)]);
  const ref = detail?.tattoo ?? null;
  const wa = s.whatsappNumber ? whatsappLink(s.whatsappNumber, 'Hi! I’d like to talk about a tattoo idea.') : null;

  const channels = [
    wa && { label: 'WhatsApp', value: formatPhoneForDisplay(s.whatsappNumber), href: wa, external: true },
    s.instagramUrl && { label: 'Instagram', value: instagramHandle(s.instagramUrl), href: s.instagramUrl, external: true },
    s.contactEmail && { label: 'Email', value: s.contactEmail, href: `mailto:${s.contactEmail}`, external: false },
    s.phone && { label: 'Phone', value: s.phone, href: `tel:${s.phone.replace(/[^\d+]/g, '')}`, external: false },
  ].filter(Boolean) as Array<{ label: string; value: string; href: string; external: boolean }>;

  return (
    <div className="gutter pt-28 pb-24 md:pt-40 md:pb-36">
      <div className="page-grid gap-y-16">
        <div className="col-span-12 lg:col-span-5">
          <SectionLabel>Contact</SectionLabel>
          <h1 className="text-display-xl mt-6 max-w-[9ch] text-bone">Start with an idea</h1>
          <p className="text-lede mt-8 max-w-[40ch] text-bone-2">
            Tell me what you have in mind — a subject, a feeling, a placement. You will hear back to arrange a consultation.
          </p>

          {channels.length > 0 && (
            <ul className="mt-12 border-t border-line">
              {channels.map((c) => (
                <li key={c.label} className="border-b border-line">
                  <a
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group flex min-h-16 items-center justify-between gap-6 py-4"
                  >
                    <span className="text-meta w-24 shrink-0 text-mute">{c.label}</span>
                    <span className="min-w-0 flex-1 truncate text-bone">{c.value}</span>
                    <ArrowUpRight
                      size={17}
                      strokeWidth={1.5}
                      aria-hidden
                      className="text-bone-2 transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-bone"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}

          {s.location && (
            <div className="mt-10">
              <p className="text-meta text-mute">Studio</p>
              <p className="mt-2 whitespace-pre-line text-bone-2">{s.location}</p>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          {ref && (
            <div className="mb-10 flex items-center gap-5 border border-line p-3 pr-5">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-ink-3">
                <Image src={ref.image.thumbUrl} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-meta text-mute">Enquiring about</p>
                <p className="truncate font-display text-[1.375rem] leading-tight text-bone">{ref.title}</p>
                <p className="text-meta text-bone-2">{SIZE_LABEL[ref.size]}</p>
              </div>
            </div>
          )}
          <EnquiryForm
            whatsappNumber={s.whatsappNumber}
            reference={ref ? { slug: ref.slug, title: ref.title, size: ref.size, url: `${SITE_URL}/work/${ref.slug}` } : null}
          />
        </div>
      </div>
    </div>
  );
}
