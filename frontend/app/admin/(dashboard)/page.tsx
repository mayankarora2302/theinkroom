'use client';

import { ArrowRight, Images, Inbox, Plus, Settings, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, ErrorBlock, LoadingBlock, PageHeader } from '@/components/admin/ui';
import { adminRequest } from '@/lib/admin-api';
import { SIZE_LABEL } from '@/lib/format';
import type { AdminTattoo } from '@/lib/types';

interface Stats {
  total: number;
  published: number;
  unpublished: number;
  featured: number;
  featuredLimit: number;
  newEnquiries: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<AdminTattoo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([adminRequest<Stats>('/stats'), adminRequest<AdminTattoo[]>('/tattoos?limit=4')])
      .then(([s, r]) => {
        setStats(s);
        setRecent(r);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBlock message={error} onRetry={() => {
        setError(null);
        load();
      }} />;
  if (!stats) return <LoadingBlock />;

  const tiles = [
    { label: 'Published tattoos', value: stats.published, note: 'Visible on the website' },
    { label: 'All portfolio items', value: stats.total, note: 'Including drafts' },
    { label: 'On the homepage', value: `${stats.featured} / ${stats.featuredLimit}`, note: 'Carousel slots used' },
    { label: 'Unpublished drafts', value: stats.unpublished, note: 'Hidden from visitors' },
  ];

  const actions = [
    { href: '/admin/tattoos/new', icon: Plus, title: 'Upload a new tattoo', text: 'Add a photograph, title, size and price.' },
    { href: '/admin/tattoos', icon: Images, title: 'Manage portfolio', text: 'Edit, publish, hide or delete pieces.' },
    { href: '/admin/featured', icon: Star, title: 'Homepage carousel', text: 'Choose and order the featured photographs.' },
    { href: '/admin/settings', icon: Settings, title: 'Website information', text: 'Biography, contact details and FAQs.' },
  ];

  return (
    <>
      <PageHeader title="Overview" description="Everything on your website, at a glance." />

      {stats.newEnquiries > 0 && (
        <Link
          href="/admin/enquiries"
          className="mb-6 flex items-center justify-between gap-4 rounded-[4px] border border-graphite bg-graphite px-5 py-4 text-paper"
        >
          <span className="flex items-center gap-3">
            <Inbox size={18} aria-hidden />
            {stats.newEnquiries} new {stats.newEnquiries === 1 ? 'enquiry' : 'enquiries'} waiting for a reply
          </span>
          <ArrowRight size={18} aria-hidden />
        </Link>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <dt className="text-[0.875rem] text-graphite-2">{t.label}</dt>
            <dd className="mt-2 font-display text-[2.5rem] leading-none text-graphite tabular-nums">{t.value}</dd>
            <dd className="mt-2 text-[0.8125rem] text-graphite-2">{t.note}</dd>
          </Card>
        ))}
      </dl>

      <h2 className="mt-12 mb-4 text-[1.125rem] font-semibold">Quick actions</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {actions.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full items-start gap-4 rounded-[4px] border border-rule bg-card p-5 transition-colors hover:border-graphite-2">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-paper-2 text-graphite">
                <Icon size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-graphite">{title}</span>
                <span className="mt-0.5 block text-[0.875rem] text-graphite-2">{text}</span>
              </span>
              <ArrowRight size={18} aria-hidden className="ml-auto shrink-0 self-center text-graphite-2 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 mb-4 flex items-center justify-between">
        <h2 className="text-[1.125rem] font-semibold">Recently added</h2>
        {recent.length > 0 && (
          <Link href="/admin/tattoos" className="text-[0.9375rem] text-graphite-2 underline underline-offset-4 hover:text-graphite">
            See all
          </Link>
        )}
      </div>
      {recent.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-graphite-2">No tattoos yet. Upload your first photograph to start the portfolio.</p>
          <Link href="/admin/tattoos/new" className="mt-4 inline-flex h-11 items-center gap-2 rounded-[3px] bg-graphite px-4 font-medium text-paper">
            <Plus size={16} aria-hidden /> Upload a tattoo
          </Link>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {recent.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/tattoos/${t.id}`} className="block overflow-hidden rounded-[4px] border border-rule bg-card hover:border-graphite-2">
                <div className="relative aspect-[4/5] bg-paper-2">
                  <Image src={t.image.thumbUrl} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                </div>
                <div className="p-3">
                  <p className="truncate font-medium">{t.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge>{SIZE_LABEL[t.size]}</Badge>
                    {t.isPublished ? <Badge tone="success">Published</Badge> : <Badge tone="warn">Draft</Badge>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
