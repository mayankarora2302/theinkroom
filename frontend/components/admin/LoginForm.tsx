'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { adminRequest, ApiError, setCsrfToken } from '@/lib/admin-api';
import { Button, describedBy, Field, inputClass } from './ui';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  // Only allow redirects back into the admin area of this site (no //host, schemes or ../ tricks).
  const safeDestination = () => {
    const next = params.get('next');
    if (!next) return '/admin';
    try {
      const url = new URL(next, window.location.origin);
      const inAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
      return url.origin === window.location.origin && inAdmin ? `${url.pathname}${url.search}` : '/admin';
    } catch {
      return '/admin';
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const f: Record<string, string> = {};
    if (!username.trim()) f.username = 'Enter your username or email.';
    if (!password) f.password = 'Enter your password.';
    setFields(f);
    if (Object.keys(f).length) return;
    setBusy(true);
    try {
      const d = await adminRequest<{ csrfToken: string }>('/auth/login', { method: 'POST', json: { username: username.trim(), password } });
      setCsrfToken(d.csrfToken);
      router.replace(safeDestination());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 rounded-[4px] border border-rule bg-card p-6">
      {error && (
        <p role="alert" className="rounded-[3px] bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] text-danger">
          {error}
        </p>
      )}
      <Field label="Username or email" htmlFor="username" error={fields.username}>
        <input
          id="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={Boolean(fields.username)}
          aria-describedby={describedBy('username', { error: fields.username })}
          className={inputClass}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={fields.password}>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fields.password)}
            aria-describedby={describedBy('password', { error: fields.password })}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute top-1/2 right-1 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center text-graphite-2 hover:text-graphite"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
