'use client';

import { Loader2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

/* ───────────────────────────── Buttons ───────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-graphite text-paper hover:bg-black',
  secondary: 'border border-rule bg-card text-graphite hover:border-graphite-2',
  ghost: 'text-graphite-2 hover:bg-paper-2 hover:text-graphite',
  danger: 'bg-danger text-white hover:bg-[#8f3426]',
};

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[3px] px-4 text-[0.9375rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ───────────────────────────── Form fields ───────────────────────────── */

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[0.9375rem] font-medium text-graphite">
        {label}
        {optional && <span className="ml-1.5 font-normal text-graphite-2">(optional)</span>}
      </label>
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1 text-[0.8125rem] leading-snug text-graphite-2">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-[0.875rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-[3px] border border-rule bg-card px-3.5 py-2.5 text-[1rem] text-graphite placeholder:text-[#9b958c] focus:border-graphite focus:outline-none focus:ring-2 focus:ring-graphite/10 aria-[invalid=true]:border-danger';

export function describedBy(id: string, opts: { hint?: boolean; error?: string }) {
  return [opts.hint ? `${id}-hint` : null, opts.error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
}

/** Accessible on/off switch built on a checkbox. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={`flex items-start gap-4 ${disabled ? 'opacity-60' : ''}`}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={description ? `${id}-d` : undefined}
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-full bg-[#cfc8bd] transition-colors checked:bg-success disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graphite"
        />
        <span className="pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[0.9375rem] font-medium text-graphite">{label}</span>
        {description && (
          <span id={`${id}-d`} className="mt-0.5 block text-[0.8125rem] leading-snug text-graphite-2">
            {description}
          </span>
        )}
      </label>
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warn' | 'accent'; children: React.ReactNode }) {
  const tones = {
    neutral: 'bg-paper-2 text-graphite-2',
    success: 'bg-success-soft text-success',
    warn: 'bg-warn-soft text-[#7a5a1e]',
    accent: 'bg-graphite text-paper',
  };
  return <span className={`inline-flex items-center rounded-[3px] px-2 py-0.5 text-[0.75rem] font-medium ${tones[tone]}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[4px] border border-rule bg-card ${className}`}>{children}</section>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[2.25rem] leading-none text-graphite md:text-[2.75rem]">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-graphite-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────────── Dialog ───────────────────────────── */

/** Native <dialog> gives focus trapping, Escape-to-close and a backdrop for free. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`admin m-auto w-[calc(100%-2rem)] rounded-[6px] bg-card p-0 text-graphite shadow-2xl backdrop:bg-black/50 ${wide ? 'max-w-4xl' : 'max-w-md'}`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-[1.25rem] font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-m-2 inline-flex h-10 w-10 items-center justify-center rounded text-graphite-2 hover:bg-paper-2">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="text-graphite-2">{message}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

/* ───────────────────────────── Toasts ───────────────────────────── */

type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 md:right-6 md:left-auto md:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-sm rounded-[4px] px-4 py-3 text-[0.9375rem] shadow-lg ${t.tone === 'error' ? 'bg-danger text-white' : 'bg-graphite text-paper'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ───────────────────────────── States ───────────────────────────── */

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-graphite-2">
      <Loader2 size={18} className="animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[4px] border border-danger/30 bg-danger-soft p-5 text-danger">
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
