'use client';

import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { formatPrice, pad2, SIZE_LABEL } from '@/lib/format';
import type { Tattoo } from '@/lib/types';
import { useReducedMotion } from '@/lib/use-reduced-motion';

interface Props {
  items: Tattoo[];
  /** Milliseconds per slide while auto-rotating. */
  interval?: number;
  /** Sizing for the image stage, e.g. an aspect ratio or a height. */
  stageClassName?: string;
  sizes?: string;
  /** Preload the first image (use for the above-the-fold hero only). */
  preloadFirst?: boolean;
  /** Admin preview renders slides without links. */
  linkSlides?: boolean;
  label?: string;
}

const SWIPE_THRESHOLD = 40;

export function FeaturedCarousel({
  items,
  interval = 6500,
  stageClassName = 'aspect-[4/5]',
  sizes = '(min-width: 1024px) 58vw, 100vw',
  preloadFirst = true,
  linkSlides = true,
  label = 'Featured work',
}: Props) {
  const count = items.length;
  const reducedMotion = useReducedMotion();
  const [rawIndex, setIndex] = useState(0);
  // The list can shrink while mounted (admin preview); stay in range.
  const index = rawIndex < count ? rawIndex : 0;
  const [autoplay, setAutoplay] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1, count - 1]));
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const id = useId();

  const playing = autoplay && !reducedMotion && count > 1;
  const running = playing && !hovering && !focusWithin && !pageHidden;

  /** Show slide `i`, mounting its neighbours' images ahead of time. */
  const show = useCallback(
    (i: number) => {
      const target = ((i % count) + count) % count;
      setIndex(target);
      setMounted((prev) => {
        const next = new Set(prev);
        [target, (target + 1) % count, (target - 1 + count) % count].forEach((n) => next.add(n));
        return next.size === prev.size ? prev : next;
      });
    },
    [count],
  );

  useEffect(() => {
    const onVis = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Auto-rotation is driven by the progress bar's CSS animation, so pausing
  // (hover, focus, hidden tab) pauses the timing exactly where it is.
  const advance = useCallback(() => show(index + 1), [show, index]);

  /** Any deliberate interaction stops auto-rotation for good. */
  const goTo = useCallback(
    (i: number) => {
      setAutoplay(false);
      show(i);
    },
    [show],
  );

  if (count === 0) return null;
  const current = items[Math.min(index, count - 1)]!;
  const price = formatPrice(current.estimatedPrice);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointer.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swiped.current = false;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped.current = true;
      goTo(dx < 0 ? index + 1 : index - 1);
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="relative flex flex-col"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false);
      }}
    >
      {/* Stage */}
      <div
        className={`relative overflow-hidden bg-ink-3 select-none touch-pan-y ${stageClassName}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointer.current = null)}
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
        id={`${id}-slides`}
      >
        {items.map((t, i) => {
          const active = i === index;
          const content = mounted.has(i) ? (
            <Image
              src={t.image.url}
              alt={t.image.alt}
              fill
              sizes={sizes}
              quality={82}
              placeholder={t.image.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={t.image.blurDataUrl || undefined}
              preload={preloadFirst && i === 0}
              loading={i === 0 ? 'eager' : undefined}
              draggable={false}
              className={`object-cover transition-transform duration-[1600ms] ease-out-soft ${active ? 'scale-100' : 'scale-[1.035]'}`}
            />
          ) : null;
          return (
            <div
              key={t.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${t.title}`}
              aria-hidden={!active}
              inert={!active}
              className={`absolute inset-0 transition-opacity duration-700 ease-out-soft ${active ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}
            >
              {linkSlides ? (
                <Link href={`/work/${t.slug}`} className="block h-full w-full" draggable={false} tabIndex={active ? 0 : -1}>
                  <span className="sr-only">View {t.title}</span>
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {/* Caption + controls */}
      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-start gap-x-5 md:mt-5 md:gap-x-7">
        <p className="text-meta pt-1.5 text-mute tabular-nums" aria-hidden>
          <span className="text-bone">{pad2(index + 1)}</span>
          <span className="px-1.5">/</span>
          {pad2(count)}
        </p>

        <div className="min-w-0" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
          {linkSlides ? (
            <Link href={`/work/${current.slug}`} className="text-display-s link-draw block truncate text-bone">
              {current.title}
            </Link>
          ) : (
            <p className="text-display-s truncate text-bone">{current.title}</p>
          )}
          <p className="text-meta mt-1 text-bone-2">
            {SIZE_LABEL[current.size]}
            {current.placement && <> · {current.placement}</>}
            {price && <> · Est. from {price}</>}
          </p>
        </div>

        {count > 1 && (
          <div className="flex items-center gap-1.5">
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setAutoplay((v) => !v)}
                aria-label={playing ? 'Pause automatic rotation' : 'Start automatic rotation'}
                className="inline-flex h-11 w-9 items-center justify-center text-bone-2 transition-colors hover:text-bone sm:w-11"
              >
                {playing ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-controls={`${id}-slides`}
              aria-label="Previous piece"
              className="inline-flex h-11 w-11 items-center justify-center border border-line-strong text-bone transition-colors duration-200 hover:border-bone hover:bg-bone hover:text-ink"
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-controls={`${id}-slides`}
              aria-label="Next piece"
              className="inline-flex h-11 w-11 items-center justify-center border border-line-strong text-bone transition-colors duration-200 hover:border-bone hover:bg-bone hover:text-ink"
            >
              <ArrowRight size={18} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Position indicators (double as autoplay progress) */}
      {count > 1 && (
        <div className="mt-4 flex gap-1.5" role="group" aria-label="Choose a slide">
          {items.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${i + 1} of ${count}: ${t.title}`}
              aria-current={i === index ? 'true' : undefined}
              className="group relative h-6 flex-1"
            >
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong transition-colors group-hover:bg-bone-2" />
              {i === index && (
                <span
                  key={`${index}-${playing}`}
                  className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 origin-left bg-bone"
                  onAnimationEnd={advance}
                  style={
                    playing
                      ? { animation: `progress ${interval}ms linear forwards`, animationPlayState: running ? 'running' : 'paused' }
                      : undefined
                  }
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
