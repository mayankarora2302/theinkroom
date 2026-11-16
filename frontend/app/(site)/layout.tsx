import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getSettings } from '@/lib/api';
import { siteName, whatsappLink } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const whatsappUrl = s.whatsappNumber ? whatsappLink(s.whatsappNumber, 'Hi! I’d like to ask about a tattoo.') : null;

  // Structured data built only from information the artist has entered.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TattooParlor',
    name: siteName(s),
    url: SITE_URL,
    ...(s.tagline ? { description: s.tagline } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.contactEmail ? { email: s.contactEmail } : {}),
    ...(s.location ? { address: { '@type': 'PostalAddress', streetAddress: s.location } } : {}),
    ...(s.instagramUrl ? { sameAs: [s.instagramUrl] } : {}),
    ...(s.artistName ? { founder: { '@type': 'Person', name: s.artistName, jobTitle: 'Tattoo artist' } } : {}),
    ...(s.portrait ? { image: s.portrait.url } : {}),
  };

  return (
    <>
      <SiteHeader
        brand={siteName(s)}
        contact={{ whatsappUrl, instagramUrl: s.instagramUrl, email: s.contactEmail, location: s.location }}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter settings={s} whatsappUrl={whatsappUrl} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </>
  );
}
