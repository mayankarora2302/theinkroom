import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

type Variant = 'solid' | 'outline' | 'text';

const styles: Record<Variant, string> = {
  solid: 'h-12 bg-bone px-6 text-ink hover:bg-white',
  outline: 'h-12 border border-line-strong px-6 text-bone hover:border-bone',
  text: 'h-12 text-bone link-line',
};

/** Primary call-to-action link. External links open in a new tab. */
export function ArrowLink({
  href,
  children,
  variant = 'solid',
  className = '',
  external,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  external?: boolean;
}) {
  const cls = `group inline-flex items-center justify-center gap-2.5 text-[0.9375rem] font-medium transition-colors duration-200 ${styles[variant]} ${className}`;
  const icon = (
    <ArrowUpRight
      size={17}
      strokeWidth={1.5}
      aria-hidden
      className="transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    />
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
        {icon}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
      {icon}
    </Link>
  );
}
