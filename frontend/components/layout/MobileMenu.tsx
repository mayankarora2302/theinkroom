'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { instagramHandle, pad2 } from '@/lib/format';
import { NAV_LINKS } from '@/lib/site';

interface Props {
  open: boolean;
  onClose: () => void;
  isActive: (href: string) => boolean;
  contact: { whatsappUrl: string | null; instagramUrl: string; email: string; location: string };
}

export function MobileMenu({ open, onClose, isActive, contact }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('a, button');
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a, button'));
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div
      id="mobile-menu"
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      hidden={!open}
      className="fixed inset-0 z-30 flex flex-col bg-ink pt-16 lg:hidden"
    >
      <nav aria-label="Mobile" className="gutter flex flex-1 flex-col justify-center">
        <ul className="flex flex-col">
          {NAV_LINKS.map((l, i) => (
            <li key={l.href} className="border-b border-line first:border-t">
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? 'page' : undefined}
                onClick={onClose}
                className="flex items-baseline gap-5 py-4 text-bone aria-[current=page]:text-accent-strong"
              >
                <span className="text-meta w-6 text-mute">{pad2(i + 1)}</span>
                <span className="font-display text-[2.5rem] leading-none">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/contact"
          onClick={onClose}
          className="mt-10 inline-flex h-13 items-center justify-center bg-bone px-6 text-[0.9375rem] font-medium text-ink"
        >
          Book a consultation
        </Link>
      </nav>
      <div className="gutter grid grid-cols-2 gap-4 border-t border-line py-6 text-meta text-bone-2">
        {contact.whatsappUrl && (
          <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="py-1">
            WhatsApp
          </a>
        )}
        {contact.instagramUrl && (
          <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="py-1">
            {instagramHandle(contact.instagramUrl)}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="col-span-2 py-1">
            {contact.email}
          </a>
        )}
        {contact.location && <p className="col-span-2 text-mute">{contact.location}</p>}
      </div>
    </div>
  );
}
