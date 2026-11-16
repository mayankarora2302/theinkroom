import Link from 'next/link';

export default function TattooNotFound() {
  return (
    <section className="gutter flex min-h-[80svh] flex-col justify-center pt-28 pb-16">
      <p className="text-meta text-mute">Not in the portfolio</p>
      <h1 className="text-display-l mt-4 max-w-[16ch] text-bone">This piece is no longer on display.</h1>
      <p className="text-lede mt-6 max-w-[44ch] text-bone-2">It may have been moved or taken down. The rest of the work is still here.</p>
      <Link href="/work" className="link-line mt-10 w-fit text-bone">
        Browse the portfolio
      </Link>
    </section>
  );
}
