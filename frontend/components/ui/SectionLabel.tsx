import { pad2 } from '@/lib/format';

/** Small editorial section marker, e.g. "01 — Selected work". */
export function SectionLabel({ n, children, className = '' }: { n?: number; children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-meta flex items-baseline gap-2 text-mute ${className}`}>
      {n !== undefined && <span className="text-accent tabular-nums">{pad2(n)}</span>}
      {n !== undefined && <span aria-hidden>—</span>}
      <span>{children}</span>
    </p>
  );
}
