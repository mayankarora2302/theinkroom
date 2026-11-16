'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Check, Eye, GripVertical, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeaturedCarousel } from '@/components/carousel/FeaturedCarousel';
import { Button, Card, Dialog, ErrorBlock, LoadingBlock, PageHeader, useToast } from '@/components/admin/ui';
import { adminRequest, adminRequestFull } from '@/lib/admin-api';
import { SIZE_LABEL } from '@/lib/format';
import type { AdminTattoo } from '@/lib/types';

/** Every published tattoo, fetched 100 at a time so large portfolios are complete. */
async function loadAllPublished() {
  const all: AdminTattoo[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, meta } = await adminRequestFull<AdminTattoo[], { totalPages: number }>(`/tattoos?status=published&limit=100&page=${page}`);
    all.push(...data);
    if (!meta || page >= meta.totalPages) break;
  }
  return all;
}

export default function FeaturedPage() {
  const toast = useToast();
  const [published, setPublished] = useState<AdminTattoo[] | null>(null);
  const [limit, setLimit] = useState(7);
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [announce, setAnnounce] = useState('');

  const load = useCallback(() => {
    Promise.all([loadAllPublished(), adminRequest<{ featuredLimit: number }>('/stats')])
      .then(([items, stats]) => {
        setPublished(items);
        setLimit(stats.featuredLimit);
        const current = items
          .filter((t) => t.isFeatured)
          .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0))
          .map((t) => t.id);
        setSelected(current);
        setSaved(current);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const byId = useMemo(() => new Map((published ?? []).map((t) => [t.id, t])), [published]);
  const dirty = selected.join() !== saved.join();
  const full = selected.length >= limit;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= selected.length) return;
    setSelected((s) => arrayMove(s, from, to));
    const t = byId.get(selected[from]!);
    setAnnounce(`${t?.title ?? 'Item'} moved to position ${to + 1} of ${selected.length}.`);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(selected.indexOf(String(e.active.id)), selected.indexOf(String(e.over.id)));
  };

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= limit ? s : [...s, id]));
  };

  async function save() {
    setSaving(true);
    try {
      await adminRequest('/featured/reorder', { method: 'PUT', json: { ids: selected } });
      setSaved(selected);
      toast('Homepage carousel updated. The website shows the new selection now.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBlock message={error} onRetry={() => {
        setError(null);
        load();
      }} />;
  if (!published) return <LoadingBlock />;

  const selectedItems = selected.map((id) => byId.get(id)).filter((t): t is AdminTattoo => Boolean(t));

  return (
    <>
      <PageHeader
        title="Homepage carousel"
        description="Choose which published tattoos appear in the large carousel at the top of your homepage, and in what order."
        actions={
          <Button variant="secondary" onClick={() => setPreview(true)} disabled={selectedItems.length === 0}>
            <Eye size={16} aria-hidden /> Preview
          </Button>
        }
      />

      <p className="sr-only" aria-live="assertive">
        {announce}
      </p>

      <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Selected, in order */}
        <Card className="self-start lg:sticky lg:top-8">
          <div className="flex items-baseline justify-between border-b border-rule px-5 py-4">
            <h2 className="font-semibold">On the homepage</h2>
            <span className={`text-[0.875rem] tabular-nums ${full ? 'font-medium text-graphite' : 'text-graphite-2'}`}>
              {selected.length} of {limit}
            </span>
          </div>
          {selectedItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.9375rem] text-graphite-2">
              Nothing selected. Tick tattoos on the right to add them. While empty, the homepage shows your latest published piece instead.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={selected} strategy={verticalListSortingStrategy}>
                <ol className="divide-y divide-rule">
                  {selectedItems.map((t, i) => (
                    <SortableRow
                      key={t.id}
                      tattoo={t}
                      index={i}
                      count={selectedItems.length}
                      onUp={() => move(i, i - 1)}
                      onDown={() => move(i, i + 1)}
                      onRemove={() => toggle(t.id)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
          <p className="border-t border-rule px-5 py-3 text-[0.8125rem] text-graphite-2">
            Drag the handle to reorder, or use the arrow buttons. The first item shows first.
            {' '}
            <Link href="/admin/settings#carousel" className="underline underline-offset-2">
              Change the limit
            </Link>
          </p>
        </Card>

        {/* All published work */}
        <section aria-labelledby="available">
          <h2 id="available" className="mb-3 font-semibold">
            Published tattoos
          </h2>
          {published.length === 0 ? (
            <Card className="p-8 text-center text-graphite-2">
              No published tattoos yet.{' '}
              <Link href="/admin/tattoos/new" className="underline underline-offset-2">
                Upload one
              </Link>{' '}
              to feature it here.
            </Card>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {published.map((t) => {
                const on = selected.includes(t.id);
                const blocked = !on && full;
                return (
                  <li key={t.id}>
                    <label
                      className={`group block cursor-pointer overflow-hidden rounded-[4px] border-2 bg-card transition-colors ${
                        on ? 'border-graphite' : 'border-transparent hover:border-rule'
                      } ${blocked ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div className="relative aspect-[4/5] bg-paper-2">
                        <Image src={t.image.thumbUrl} alt="" fill sizes="(min-width: 640px) 20vw, 45vw" className="object-cover" />
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={blocked}
                          onChange={() => toggle(t.id)}
                          className="peer sr-only"
                          aria-label={`${on ? 'Remove' : 'Add'} “${t.title}” ${on ? 'from' : 'to'} the homepage`}
                        />
                        <span
                          className={`absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-graphite ${
                            on ? 'border-graphite bg-graphite text-paper' : 'border-white bg-black/30 text-transparent'
                          }`}
                          aria-hidden
                        >
                          <Check size={15} strokeWidth={3} />
                        </span>
                        {on && (
                          <span className="absolute top-2 left-2 rounded-[3px] bg-graphite px-1.5 py-0.5 text-[0.75rem] font-medium text-paper tabular-nums">
                            #{selected.indexOf(t.id) + 1}
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-[0.9375rem] font-medium">{t.title}</p>
                        <p className="text-[0.8125rem] text-graphite-2">{SIZE_LABEL[t.size]}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {full && (
            <p className="mt-3 text-[0.875rem] text-graphite-2" role="status">
              The carousel is full. Remove one to add another.
            </p>
          )}
        </section>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-card/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-[0.9375rem]">You have unsaved changes to the carousel.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelected(saved)} disabled={saving}>
                Discard
              </Button>
              <Button onClick={save} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={preview} onClose={() => setPreview(false)} title="Carousel preview" wide>
        <div className="rounded-[4px] bg-ink p-4 text-bone md:p-6">
          {selectedItems.length > 0 && (
            <FeaturedCarousel items={selectedItems} linkSlides={false} preloadFirst={false} stageClassName="aspect-[5/4]" sizes="(min-width: 900px) 800px, 100vw" />
          )}
        </div>
        <p className="mt-3 text-[0.8125rem] text-graphite-2">{dirty ? 'This preview includes changes you haven’t saved yet.' : 'This is what visitors see now.'}</p>
      </Dialog>
    </>
  );
}

function SortableRow({
  tattoo,
  index,
  count,
  onUp,
  onDown,
  onRemove,
}: {
  tattoo: AdminTattoo;
  index: number;
  count: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: tattoo.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-card px-2 py-2 sm:px-3 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder “${tattoo.title}”`}
        className="inline-flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-graphite-2 hover:text-graphite active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <span className="w-5 shrink-0 text-center text-[0.8125rem] text-graphite-2 tabular-nums">{index + 1}</span>
      <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[2px] bg-paper-2">
        <Image src={tattoo.image.thumbUrl} alt="" fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium">{tattoo.title}</p>
        <p className="text-[0.8125rem] text-graphite-2">{SIZE_LABEL[tattoo.size]}</p>
      </div>
      <div className="flex shrink-0">
        <button type="button" onClick={onUp} disabled={index === 0} aria-label={`Move “${tattoo.title}” up`} className="inline-flex h-10 w-9 items-center justify-center rounded text-graphite-2 hover:bg-paper-2 disabled:opacity-30">
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={index === count - 1}
          aria-label={`Move “${tattoo.title}” down`}
          className="inline-flex h-10 w-9 items-center justify-center rounded text-graphite-2 hover:bg-paper-2 disabled:opacity-30"
        >
          <ArrowDown size={16} />
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove “${tattoo.title}” from the homepage`} className="inline-flex h-10 w-9 items-center justify-center rounded text-graphite-2 hover:bg-danger-soft hover:text-danger">
          <X size={16} />
        </button>
      </div>
    </li>
  );
}
