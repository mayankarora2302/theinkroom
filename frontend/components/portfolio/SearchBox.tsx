'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Small search field that updates the URL, so results are shareable and server-rendered. */
export function SearchBox({ defaultValue, size }: { defaultValue: string; size?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();

  const go = (q: string) => {
    const qs = new URLSearchParams();
    if (size) qs.set('size', size);
    if (q.trim()) qs.set('q', q.trim());
    const str = qs.toString();
    startTransition(() => router.push(str ? `/work?${str}` : '/work', { scroll: false }));
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
      className="relative w-full md:w-72"
    >
      <label htmlFor="work-search" className="sr-only">
        Search the portfolio
      </label>
      <Search size={16} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-mute" />
      <input
        id="work-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the work"
        maxLength={80}
        className="h-10 w-full border-b border-line-strong bg-transparent pr-8 pl-7 text-[0.9375rem] text-bone placeholder:text-mute focus:border-bone focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        aria-busy={pending}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            go('');
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-0 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-mute hover:text-bone"
        >
          <X size={15} strokeWidth={1.5} />
        </button>
      )}
    </form>
  );
}
