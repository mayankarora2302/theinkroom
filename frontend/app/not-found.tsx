import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="gutter flex min-h-svh flex-col justify-center py-16">
      <p className="text-meta text-mute">404</p>
      <h1 className="text-display-l mt-4 max-w-[14ch] text-bone">This page isn’t here.</h1>
      <div className="mt-10 flex gap-8">
        <Link href="/" className="link-line text-bone">
          Home
        </Link>
        <Link href="/work" className="link-line text-bone">
          Work
        </Link>
      </div>
    </main>
  );
}
