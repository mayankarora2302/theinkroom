'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NAV_LINKS } from '@/lib/site';
import { MobileMenu } from './MobileMenu';

interface Props {
  brand: string;
  contact: { whatsappUrl: string | null; instagramUrl: string; email: string; location: string };
}

export function SiteHeader({ brand, contact }: Props) {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-bone focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-300 ease-out-soft ${
          solid || open ? 'border-b border-line bg-ink/95' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="gutter flex h-16 items-center justify-between gap-6 md:h-[4.5rem]">
          <Link href="/" className="font-display text-[1.6rem] leading-none tracking-[-0.01em] text-bone md:text-[1.75rem]">
            {brand}
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
            <ul className="flex items-center gap-8 text-[0.9375rem]">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(l.href) ? 'page' : undefined}
                    className="link-draw text-bone-2 transition-colors duration-200 hover:text-bone aria-[current=page]:text-bone"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className="inline-flex h-10 items-center border border-line-strong px-4 text-[0.875rem] font-medium text-bone transition-colors duration-200 hover:border-bone hover:bg-bone hover:text-ink"
            >
              Book a consultation
            </Link>
          </nav>

          <button
            ref={menuButton}
            type="button"
            className="-mr-2 inline-flex h-11 items-center gap-3 px-2 text-[0.9375rem] text-bone lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span>{open ? 'Close' : 'Menu'}</span>
            <span aria-hidden className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-current transition-transform duration-300 ease-out-soft ${open ? 'top-1.5 rotate-45' : 'top-0.5'}`}
              />
              <span
                className={`absolute left-0 h-px w-5 bg-current transition-transform duration-300 ease-out-soft ${open ? 'top-1.5 -rotate-45' : 'top-2.5'}`}
              />
            </span>
          </button>
        </div>
      </header>
      <MobileMenu
        open={open}
        onClose={() => {
          setOpen(false);
          menuButton.current?.focus();
        }}
        isActive={isActive}
        contact={contact}
      />
    </>
  );
}
