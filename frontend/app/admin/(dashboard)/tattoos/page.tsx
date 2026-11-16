'use client';

import { Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, ConfirmDialog, ErrorBlock, inputClass, LoadingBlock, PageHeader, useToast } from '@/components/admin/ui';
import { adminRequest, adminRequestFull } from '@/lib/admin-api';
import { formatPrice, SIZE_LABEL, SIZES } from '@/lib/format';
import type { AdminTattoo } from '@/lib/types';

interface Meta {
  page: number;
  total: number;
  totalPages: number;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function TattoosPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminTattoo[] | null>(null);
  const [meta, setMeta] = useState<Meta>({ page: 1, total: 0, totalPages: 1 });
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [size, setSize] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<AdminTattoo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '30', status });
    if (size) qs.set('size', size);
    if (query) qs.set('q', query);
    adminRequestFull<AdminTattoo[], Meta>(`/tattoos?${qs}`)
      .then(({ data, meta }) => {
        setItems(data);
        if (meta) setMeta(meta);
      })
      .catch((e: Error) => setError(e.message));
  }, [page, status, size, query]);

  useEffect(load, [load]);

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminRequest(`/tattoos/${toDelete.id}`, { method: 'DELETE' });
      toast(`“${toDelete.title}” was deleted.`);
      setToDelete(null);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function toggleFeatured(t: AdminTattoo) {
    setBusyId(t.id);
    try {
      const updated = await adminRequest<AdminTattoo>(`/tattoos/${t.id}/featured`, { method: 'PATCH', json: { isFeatured: !t.isFeatured } });
      setItems((list) => list?.map((x) => (x.id === t.id ? updated : x)) ?? null);
      toast(updated.isFeatured ? 'Added to the homepage carousel.' : 'Removed from the homepage carousel.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = Boolean(query || status !== 'all' || size);

  return (
    <>
      <PageHeader
        title="Tattoos"
        description="Every piece in your portfolio. Drafts stay hidden from the website until you publish them."
        actions={
          <Link href="/admin/tattoos/new" className="inline-flex h-11 items-center gap-2 rounded-[3px] bg-graphite px-4 font-medium text-paper hover:bg-black">
            <Plus size={16} aria-hidden /> Upload tattoo
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
          className="relative"
        >
          <label htmlFor="q" className="sr-only">
            Search tattoos
          </label>
          <Search size={16} aria-hidden className="absolute top-1/2 left-3.5 -translate-y-1/2 text-graphite-2" />
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (!e.target.value) setQuery('');
            }}
            placeholder="Search by title, style or placement"
            className={`${inputClass} pl-10`}
          />
        </form>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as typeof status);
          }}
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <label className="sr-only" htmlFor="size">
          Size
        </label>
        <select
          id="size"
          value={size}
          onChange={(e) => {
            setPage(1);
            setSize(e.target.value);
          }}
          className={inputClass}
        >
          <option value="">All sizes</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {SIZE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={() => {
          setError(null);
          load();
        }} />
      ) : !items ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-graphite-2">{filtered ? 'No tattoos match these filters.' : 'Your portfolio is empty. Upload your first tattoo to get started.'}</p>
          {filtered ? (
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setQ('');
                setQuery('');
                setStatus('all');
                setSize('');
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Link href="/admin/tattoos/new" className="mt-4 inline-flex h-11 items-center gap-2 rounded-[3px] bg-graphite px-4 font-medium text-paper">
              <Plus size={16} aria-hidden /> Upload tattoo
            </Link>
          )}
        </Card>
      ) : (
        <Card>
          <p className="border-b border-rule px-4 py-3 text-[0.875rem] text-graphite-2" aria-live="polite">
            {meta.total} {meta.total === 1 ? 'tattoo' : 'tattoos'}
          </p>
          <ul className="divide-y divide-rule">
            {items.map((t) => {
              const price = formatPrice(t.estimatedPrice);
              return (
                <li key={t.id} className="grid grid-cols-[4.5rem_1fr] gap-4 p-4 md:grid-cols-[4.5rem_1.6fr_0.7fr_0.8fr_0.9fr_auto] md:items-center">
                  <Link href={`/admin/tattoos/${t.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-[3px] bg-paper-2" tabIndex={-1} aria-hidden>
                    <Image src={t.image.thumbUrl} alt="" fill sizes="72px" className="object-cover" />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/admin/tattoos/${t.id}`} className="block truncate font-medium hover:underline">
                      {t.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {t.isPublished ? <Badge tone="success">Published</Badge> : <Badge tone="warn">Draft</Badge>}
                      {t.isFeatured && <Badge tone="accent">On homepage</Badge>}
                      <span className="text-[0.8125rem] text-graphite-2 md:hidden">
                        {SIZE_LABEL[t.size]}
                        {price ? ` · ${price}` : ''} · {dateFmt.format(new Date(t.createdAt))}
                      </span>
                    </div>
                  </div>
                  <p className="hidden text-[0.9375rem] md:block">{SIZE_LABEL[t.size]}</p>
                  <p className="hidden text-[0.9375rem] tabular-nums md:block">{price ?? <span className="text-graphite-2">No price</span>}</p>
                  <p className="hidden text-[0.875rem] text-graphite-2 md:block">{dateFmt.format(new Date(t.createdAt))}</p>
                  <div className="col-span-2 flex gap-1 md:col-span-1 md:justify-end">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(t)}
                      disabled={!t.isPublished || busyId === t.id}
                      aria-pressed={t.isFeatured}
                      aria-label={t.isFeatured ? `Remove “${t.title}” from the homepage` : `Feature “${t.title}” on the homepage`}
                      title={!t.isPublished ? 'Publish first to feature on the homepage' : t.isFeatured ? 'Remove from homepage' : 'Feature on homepage'}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-graphite-2 hover:bg-paper-2 hover:text-graphite disabled:opacity-40"
                    >
                      <Star size={18} fill={t.isFeatured ? 'currentColor' : 'none'} className={t.isFeatured ? 'text-[#a8835f]' : ''} />
                    </button>
                    <Link
                      href={`/admin/tattoos/${t.id}`}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[3px] border border-rule px-3 text-[0.875rem] font-medium hover:border-graphite-2 md:flex-none"
                    >
                      <Pencil size={15} aria-hidden /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setToDelete(t)}
                      aria-label={`Delete “${t.title}”`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-graphite-2 hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {meta.totalPages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between border-t border-rule px-4 py-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-[0.875rem] text-graphite-2">
                Page {page} of {meta.totalPages}
              </span>
              <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </nav>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this tattoo?"
        message={
          <p>
            “{toDelete?.title}” and its photograph will be permanently removed from your portfolio and the website. This cannot be undone.
          </p>
        }
        confirmLabel="Delete permanently"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
