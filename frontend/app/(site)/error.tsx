'use client';

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="gutter flex min-h-[80svh] flex-col justify-center pt-24 pb-16">
      <p className="text-meta text-mute">Temporarily unavailable</p>
      <h1 className="text-display-l mt-4 max-w-[14ch] text-bone">The portfolio is taking a moment to load.</h1>
      <p className="text-lede mt-6 max-w-[46ch] text-bone-2">
        Something went wrong while fetching the work. Please try again in a few seconds.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-10 inline-flex h-12 w-fit items-center bg-bone px-6 text-[0.9375rem] font-medium text-ink"
      >
        Try again
      </button>
    </section>
  );
}
