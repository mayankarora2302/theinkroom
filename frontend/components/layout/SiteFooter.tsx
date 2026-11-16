import Link from 'next/link';
import { formatPhoneForDisplay, instagramHandle, siteName } from '@/lib/format';
import { NAV_LINKS } from '@/lib/site';
import type { SiteSettings } from '@/lib/types';

export function SiteFooter({ settings, whatsappUrl }: { settings: SiteSettings; whatsappUrl: string | null }) {
  const name = siteName(settings);
  const year = new Date().getFullYear();
  const hasContact = whatsappUrl || settings.instagramUrl || settings.contactEmail || settings.phone;

  return (
    <footer className="border-t border-line bg-ink">
      <div className="gutter pt-16 pb-10 md:pt-24">
        <div className="page-grid gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <p className="text-display-l text-bone">{name}</p>
            {settings.artistName && settings.artistName !== name && (
              <p className="mt-4 text-bone-2">Tattoo work by {settings.artistName}</p>
            )}
          </div>

          <nav aria-label="Footer" className="col-span-6 md:col-span-4 lg:col-span-2 lg:col-start-7">
            <h2 className="text-meta mb-4 text-mute">Pages</h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="link-draw text-bone-2 hover:text-bone">
                  Home
                </Link>
              </li>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-draw text-bone-2 hover:text-bone">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {hasContact && (
            <div className="col-span-6 md:col-span-4 lg:col-span-2">
              <h2 className="text-meta mb-4 text-mute">Contact</h2>
              <ul className="space-y-2.5">
                {whatsappUrl && (
                  <li>
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="link-draw text-bone-2 hover:text-bone">
                      WhatsApp
                    </a>
                  </li>
                )}
                {settings.instagramUrl && (
                  <li>
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="link-draw text-bone-2 hover:text-bone">
                      {instagramHandle(settings.instagramUrl)}
                    </a>
                  </li>
                )}
                {settings.contactEmail && (
                  <li>
                    <a href={`mailto:${settings.contactEmail}`} className="link-draw break-all text-bone-2 hover:text-bone">
                      {settings.contactEmail}
                    </a>
                  </li>
                )}
                {settings.phone && (
                  <li>
                    <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="link-draw text-bone-2 hover:text-bone">
                      {settings.phone.startsWith('+') ? settings.phone : formatPhoneForDisplay(settings.phone)}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {settings.location && (
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <h2 className="text-meta mb-4 text-mute">Studio</h2>
              <p className="max-w-[28ch] whitespace-pre-line text-bone-2">{settings.location}</p>
            </div>
          )}
        </div>

        <div className="text-meta mt-20 flex flex-col gap-2 border-t border-line pt-6 text-mute sm:flex-row sm:justify-between">
          <p>
            © {year} {name}
          </p>
          <a href="#main" className="link-draw w-fit hover:text-bone">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
