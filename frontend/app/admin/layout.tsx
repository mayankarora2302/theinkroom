import type { Metadata } from 'next';
import { ToastProvider } from '@/components/admin/ui';

export const metadata: Metadata = {
  title: { default: 'Studio admin', template: '%s — Studio admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin min-h-svh bg-paper text-graphite [color-scheme:light]">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
