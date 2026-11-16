'use client';

import { Check, Mail, MessageCircle, Phone, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, ConfirmDialog, ErrorBlock, LoadingBlock, PageHeader, useToast } from '@/components/admin/ui';
import { adminRequest } from '@/lib/admin-api';
import { SIZE_LABEL } from '@/lib/format';
import type { Enquiry } from '@/lib/types';

const FILTERS = [
  { value: 'NEW', label: 'New' },
  { value: 'HANDLED', label: 'Replied' },
  { value: '', label: 'All' },
] as const;

const METHOD_LABEL = { WHATSAPP: 'WhatsApp', PHONE: 'Phone call', EMAIL: 'Email' };
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function EnquiriesPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<'NEW' | 'HANDLED' | ''>('NEW');
  const [items, setItems] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Enquiry | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminRequest<Enquiry[]>(`/enquiries${filter ? `?status=${filter}` : ''}`)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  async function setStatus(e: Enquiry, status: Enquiry['status']) {
    try {
      await adminRequest(`/enquiries/${e.id}`, { method: 'PATCH', json: { status } });
      setItems((list) => (filter ? list?.filter((x) => x.id !== e.id) : list?.map((x) => (x.id === e.id ? { ...x, status } : x))) ?? null);
      toast(status === 'HANDLED' ? 'Marked as replied.' : 'Moved back to new.');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await adminRequest(`/enquiries/${toDelete.id}`, { method: 'DELETE' });
      setItems((list) => list?.filter((x) => x.id !== toDelete.id) ?? null);
      toast('Enquiry deleted.');
      setToDelete(null);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Enquiries" description="Messages sent through the contact form on your website." />

      <div role="tablist" aria-label="Filter enquiries" className="mb-5 inline-flex rounded-[4px] border border-rule bg-card p-1">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            role="tab"
            type="button"
            aria-selected={filter === f.value}
            onClick={() => {
              if (f.value === filter) return;
              setItems(null);
              setError(null);
              setFilter(f.value);
            }}
            className="h-9 rounded-[3px] px-4 text-[0.9375rem] text-graphite-2 aria-selected:bg-graphite aria-selected:text-paper"
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={() => {
          setError(null);
          load();
        }} />
      ) : !items ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-graphite-2">{filter === 'NEW' ? 'No new enquiries. You’re all caught up.' : 'No enquiries here yet.'}</Card>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => {
            const digits = e.phone.replace(/\D/g, '');
            const waDigits = digits.length === 10 ? `91${digits}` : digits;
            return (
              <li key={e.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[1.0625rem] font-semibold">{e.name}</p>
                      <p className="text-[0.8125rem] text-graphite-2">
                        {dateFmt.format(new Date(e.createdAt))} · prefers {METHOD_LABEL[e.contactMethod]}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {e.status === 'NEW' ? <Badge tone="accent">New</Badge> : <Badge tone="success">Replied</Badge>}
                      {e.preferredSize && <Badge>{SIZE_LABEL[e.preferredSize]}</Badge>}
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-line text-graphite">{e.idea}</p>
                  {(e.placement || e.tattooTitle) && (
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[0.875rem]">
                      {e.placement && (
                        <div className="flex gap-1.5">
                          <dt className="text-graphite-2">Placement:</dt>
                          <dd>{e.placement}</dd>
                        </div>
                      )}
                      {e.tattooTitle && (
                        <div className="flex gap-1.5">
                          <dt className="text-graphite-2">Asked about:</dt>
                          <dd>
                            {e.tattooSlug ? (
                              <a href={`/work/${e.tattooSlug}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                                {e.tattooTitle}
                              </a>
                            ) : (
                              e.tattooTitle
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-rule pt-4">
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-rule px-3 text-[0.875rem] font-medium hover:border-graphite-2"
                    >
                      <MessageCircle size={15} aria-hidden /> WhatsApp
                    </a>
                    <a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-rule px-3 text-[0.875rem] font-medium hover:border-graphite-2">
                      <Phone size={15} aria-hidden /> {e.phone}
                    </a>
                    {e.email && (
                      <a href={`mailto:${e.email}`} className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-rule px-3 text-[0.875rem] font-medium hover:border-graphite-2">
                        <Mail size={15} aria-hidden /> {e.email}
                      </a>
                    )}
                    <span className="flex-1" />
                    {e.status === 'NEW' ? (
                      <Button variant="secondary" onClick={() => setStatus(e, 'HANDLED')} className="h-10">
                        <Check size={15} aria-hidden /> Mark as replied
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => setStatus(e, 'NEW')} className="h-10">
                        <RotateCcw size={15} aria-hidden /> Mark as new
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setToDelete(e)}
                      aria-label={`Delete enquiry from ${e.name}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] text-graphite-2 hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this enquiry?"
        message={<p>The enquiry from {toDelete?.name} will be permanently deleted. This cannot be undone.</p>}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
