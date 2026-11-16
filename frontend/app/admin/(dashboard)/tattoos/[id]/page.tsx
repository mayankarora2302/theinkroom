'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { TattooForm } from '@/components/admin/TattooForm';
import { Button, ConfirmDialog, ErrorBlock, LoadingBlock, PageHeader, useToast } from '@/components/admin/ui';
import { adminRequest, ApiError } from '@/lib/admin-api';
import type { AdminTattoo } from '@/lib/types';

export default function EditTattooPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [tattoo, setTattoo] = useState<AdminTattoo | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    adminRequest<AdminTattoo>(`/tattoos/${id}`)
      .then(setTattoo)
      .catch((e: ApiError) => setError({ message: e.message, notFound: e.status === 404 || e.status === 400 }));
  }, [id]);
  useEffect(load, [load]);

  async function remove() {
    setDeleting(true);
    try {
      await adminRequest(`/tattoos/${id}`, { method: 'DELETE' });
      toast(`“${tattoo?.title}” was deleted.`);
      router.push('/admin/tattoos');
    } catch (e) {
      toast((e as Error).message, 'error');
      setDeleting(false);
    }
  }

  return (
    <>
      <Link href="/admin/tattoos" className="mb-4 inline-flex items-center gap-1.5 text-[0.9375rem] text-graphite-2 hover:text-graphite">
        <ArrowLeft size={16} aria-hidden /> All tattoos
      </Link>
      {error ? (
        error.notFound ? (
          <ErrorBlock message="This tattoo doesn’t exist any more. It may have been deleted." />
        ) : (
          <ErrorBlock message={error.message} onRetry={() => {
            setError(null);
            load();
          }} />
        )
      ) : !tattoo ? (
        <LoadingBlock />
      ) : (
        <>
          <PageHeader
            title="Edit tattoo"
            description={tattoo.title}
            actions={
              <Button variant="ghost" onClick={() => setConfirm(true)} className="text-danger hover:bg-danger-soft hover:text-danger">
                <Trash2 size={16} aria-hidden /> Delete
              </Button>
            }
          />
          <TattooForm key={tattoo.updatedAt} tattoo={tattoo} onSaved={setTattoo} />
          <ConfirmDialog
            open={confirm}
            title="Delete this tattoo?"
            message={<p>“{tattoo.title}” and its photograph will be permanently removed from your portfolio and the website. This cannot be undone.</p>}
            confirmLabel="Delete permanently"
            busy={deleting}
            onConfirm={remove}
            onCancel={() => setConfirm(false)}
          />
        </>
      )}
    </>
  );
}
