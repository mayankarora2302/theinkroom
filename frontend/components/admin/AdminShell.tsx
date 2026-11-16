'use client';

import { ExternalLink, Images, Inbox, LayoutGrid, LogOut, Menu, Settings, Star, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAdminSession } from './AdminSession';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/admin/tattoos', label: 'Tattoos', icon: Images },
  { href: '/admin/featured', label: 'Homepage carousel', icon: Star },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { href: '/admin/settings', label: 'Website settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAdminSession();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col">
      <ul className="space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active(href, exact) ? 'page' : undefined}
              className="flex h-11 items-center gap-3 rounded-[3px] px-3 text-[0.9375rem] text-graphite-2 transition-colors hover:bg-paper-2 hover:text-graphite aria-[current=page]:bg-graphite aria-[current=page]:text-paper"
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-1 border-t border-rule pt-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center gap-3 rounded-[3px] px-3 text-[0.9375rem] text-graphite-2 hover:bg-paper-2 hover:text-graphite"
        >
          <ExternalLink size={18} strokeWidth={1.75} aria-hidden />
          View website
        </a>
        <button
          type="button"
          onClick={signOut}
          className="flex h-11 w-full items-center gap-3 rounded-[3px] px-3 text-left text-[0.9375rem] text-graphite-2 hover:bg-paper-2 hover:text-graphite"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
        <p className="truncate px-3 pt-2 text-[0.75rem] text-graphite-2">{user.username ?? user.email}</p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-rule bg-paper px-4 py-6 lg:flex">
        <Link href="/admin" className="mb-8 px-3 font-display text-[1.6rem] leading-none text-graphite">
          Studio admin
        </Link>
        {nav}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-paper/95 px-4 lg:hidden">
        <Link href="/admin" className="font-display text-[1.4rem] leading-none text-graphite">
          Studio admin
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded text-graphite"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      {open && (
        <div id="admin-mobile-nav" className="fixed inset-x-0 top-14 bottom-0 z-20 flex flex-col overflow-y-auto bg-paper px-4 py-5 lg:hidden">
          {nav}
        </div>
      )}

      <main id="main" className="min-w-0 px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
