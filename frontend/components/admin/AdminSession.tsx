'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminRequest, setCsrfToken, UNAUTHENTICATED_EVENT } from '@/lib/admin-api';
import { LoadingBlock } from './ui';

interface Session {
  user: { id: string; email: string | null; username: string | null };
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useAdminSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useAdminSession must be used inside <AdminSessionProvider>');
  return s;
}

/** Confirms the session with the API before rendering any admin screen. */
export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Session['user'] | null>(null);

  const toLogin = useCallback(() => {
    setCsrfToken(null);
    router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  useEffect(() => {
    let cancelled = false;
    adminRequest<{ user: Session['user']; csrfToken: string }>('/auth/me')
      .then((d) => {
        if (cancelled) return;
        setCsrfToken(d.csrfToken);
        setUser(d.user);
      })
      .catch(() => !cancelled && toLogin());
    return () => {
      cancelled = true;
    };
    // Only on first mount — later 401s arrive via the event below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHENTICATED_EVENT, toLogin);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, toLogin);
  }, [toLogin]);

  const signOut = useCallback(async () => {
    await adminRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCsrfToken(null);
    router.replace('/admin/login');
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingBlock label="Checking your session" />
      </div>
    );
  }
  return <SessionContext.Provider value={{ user, signOut }}>{children}</SessionContext.Provider>;
}
