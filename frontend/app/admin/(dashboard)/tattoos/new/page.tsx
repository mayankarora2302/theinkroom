'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TattooForm } from '@/components/admin/TattooForm';
import { PageHeader } from '@/components/admin/ui';

export default function NewTattooPage() {
  return (
    <>
      <Link href="/admin/tattoos" className="mb-4 inline-flex items-center gap-1.5 text-[0.9375rem] text-graphite-2 hover:text-graphite">
        <ArrowLeft size={16} aria-hidden /> All tattoos
      </Link>
      <PageHeader title="Upload a tattoo" description="Add a photograph and a few details. You can change anything later." />
      <TattooForm />
    </>
  );
}
