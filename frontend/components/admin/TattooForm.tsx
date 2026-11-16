'use client';

import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminUpload, ApiError } from '@/lib/admin-api';
import { SIZE_LABEL, SIZES } from '@/lib/format';
import type { AdminTattoo, TattooSize } from '@/lib/types';
import { ImageDropzone } from './ImageDropzone';
import { Button, Card, describedBy, Field, inputClass, Toggle, useToast } from './ui';

interface Values {
  title: string;
  description: string;
  size: TattooSize | '';
  estimatedPrice: string;
  style: string;
  placement: string;
  imageAlt: string;
  isPublished: boolean;
  isFeatured: boolean;
}

type Errors = Partial<Record<keyof Values | 'image' | 'form', string>>;

const SIZE_HINTS: Record<TattooSize, string> = {
  SMALL: 'Fine line, minimal, up to palm-sized',
  MEDIUM: 'Forearm, calf, shoulder',
  LARGE: 'Sleeve, back, chest, thigh',
};

function fromTattoo(t?: AdminTattoo): Values {
  return {
    title: t?.title ?? '',
    description: t?.description ?? '',
    size: t?.size ?? '',
    estimatedPrice: t?.estimatedPrice ? String(t.estimatedPrice) : '',
    style: t?.style ?? '',
    placement: t?.placement ?? '',
    imageAlt: t?.imageAlt ?? '',
    isPublished: t?.isPublished ?? true,
    isFeatured: t?.isFeatured ?? false,
  };
}

function validate(v: Values, hasImage: boolean): Errors {
  const e: Errors = {};
  if (!hasImage) e.image = 'Add a photograph of the tattoo.';
  if (!v.title.trim()) e.title = 'Give the tattoo a title.';
  if (v.title.length > 120) e.title = 'Keep the title under 120 characters.';
  if (!v.size) e.size = 'Choose Small, Medium or Large.';
  const price = v.estimatedPrice.replace(/[₹,\s]/g, '');
  if (price && (!/^\d+$/.test(price) || Number(price) < 1)) e.estimatedPrice = 'Enter whole rupees, e.g. 12000 — or leave it empty.';
  if (v.description.length > 4000) e.description = 'Keep the description under 4,000 characters.';
  return e;
}

export function TattooForm({ tattoo, onSaved }: { tattoo?: AdminTattoo; onSaved?: (t: AdminTattoo) => void }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(tattoo);
  const [values, setValues] = useState<Values>(() => fromTattoo(tattoo));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setDirty(true);
    setValues((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'isPublished' && !v) next.isFeatured = false;
      return next;
    });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(values, Boolean(file || tattoo));
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`)?.focus();
      return;
    }

    const form = new FormData();
    form.set('title', values.title.trim());
    form.set('description', values.description.trim());
    form.set('size', values.size);
    form.set('estimatedPrice', values.estimatedPrice.replace(/[₹,\s]/g, ''));
    form.set('style', values.style.trim());
    form.set('placement', values.placement.trim());
    form.set('imageAlt', values.imageAlt.trim());
    form.set('isPublished', String(values.isPublished));
    form.set('isFeatured', String(values.isPublished && values.isFeatured));
    if (file) form.set('image', file);

    setProgress(0);
    try {
      const saved = await adminUpload<AdminTattoo>(editing ? `/tattoos/${tattoo!.id}` : '/tattoos', editing ? 'PUT' : 'POST', form, setProgress);
      setDirty(false);
      toast(editing ? 'Changes saved.' : `“${saved.title}” was added to your portfolio.`);
      if (editing) {
        setFile(null);
        setValues(fromTattoo(saved));
        setProgress(null);
        onSaved?.(saved);
      } else {
        router.push('/admin/tattoos');
      }
    } catch (err) {
      setProgress(null);
      if (err instanceof ApiError) {
        setErrors({ ...(err.fields as Errors), form: err.message, ...(err.status === 413 || err.status === 415 || err.status === 422 ? { image: err.message } : {}) });
      } else {
        setErrors({ form: 'Saving failed. Please try again.' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const saving = progress !== null;

  return (
    <form onSubmit={onSubmit} noValidate>
      {errors.form && (
        <p role="alert" className="mb-6 rounded-[4px] bg-danger-soft px-4 py-3 text-danger">
          {errors.form}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div data-field="image" className="lg:sticky lg:top-8 lg:self-start">
          <ImageDropzone
            file={file}
            currentUrl={tattoo?.image.url}
            onChange={(f) => {
              setFile(f);
              setDirty(true);
              setErrors((e) => ({ ...e, image: undefined }));
            }}
            error={errors.image}
          />
        </div>

        <div className="space-y-6">
          <Card className="space-y-6 p-5 md:p-6">
            <div data-field="title">
              <Field label="Title" htmlFor="title" error={errors.title} hint="A short name visitors will see, e.g. “Peony and moth”.">
                <input
                  id="title"
                  value={values.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={120}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={describedBy('title', { hint: true, error: errors.title })}
                  className={inputClass}
                />
              </Field>
            </div>

            <div data-field="description">
              <Field label="About this tattoo" htmlFor="description" optional error={errors.description} hint="The story, the idea, or how it was made.">
                <textarea
                  id="description"
                  rows={5}
                  value={values.description}
                  onChange={(e) => set('description', e.target.value)}
                  maxLength={4000}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={describedBy('description', { hint: true, error: errors.description })}
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </Field>
            </div>

            <fieldset data-field="size" aria-describedby={errors.size ? 'size-error' : undefined}>
              <legend className="text-[0.9375rem] font-medium text-graphite">Size</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {SIZES.map((s) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" name="size" value={s} checked={values.size === s} onChange={() => set('size', s)} className="peer sr-only" />
                    <span className="flex h-full flex-col rounded-[3px] border border-rule bg-card px-4 py-3 transition-colors peer-checked:border-graphite peer-checked:bg-graphite peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-graphite">
                      <span className="font-medium">{SIZE_LABEL[s]}</span>
                      <span className="text-[0.8125rem] opacity-75">{SIZE_HINTS[s]}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errors.size && (
                <p id="size-error" role="alert" className="mt-1.5 text-[0.875rem] text-danger">
                  {errors.size}
                </p>
              )}
            </fieldset>

            <div data-field="estimatedPrice">
              <Field
                label="Estimated starting price"
                htmlFor="estimatedPrice"
                optional
                error={errors.estimatedPrice}
                hint="In rupees. Shown as “Est. from ₹…”. Leave empty to hide the price."
              >
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-graphite-2">₹</span>
                  <input
                    id="estimatedPrice"
                    inputMode="numeric"
                    value={values.estimatedPrice}
                    onChange={(e) => set('estimatedPrice', e.target.value)}
                    placeholder="e.g. 12000"
                    aria-invalid={Boolean(errors.estimatedPrice)}
                    aria-describedby={describedBy('estimatedPrice', { hint: true, error: errors.estimatedPrice })}
                    className={`${inputClass} pl-8 tabular-nums`}
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Style" htmlFor="style" optional hint="e.g. Fine line, Blackwork">
                <input id="style" value={values.style} onChange={(e) => set('style', e.target.value)} maxLength={80} className={inputClass} />
              </Field>
              <Field label="Placement" htmlFor="placement" optional hint="e.g. Inner forearm">
                <input id="placement" value={values.placement} onChange={(e) => set('placement', e.target.value)} maxLength={80} className={inputClass} />
              </Field>
            </div>

            <Field
              label="Image description (alt text)"
              htmlFor="imageAlt"
              optional
              hint="Describe the photo for people using screen readers, e.g. “Fine-line peony on an inner forearm”. If empty, the title is used."
            >
              <input id="imageAlt" value={values.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} maxLength={300} className={inputClass} />
            </Field>
          </Card>

          <Card className="space-y-5 p-5 md:p-6">
            <Toggle
              label="Published"
              checked={values.isPublished}
              onChange={(v) => set('isPublished', v)}
              description={values.isPublished ? 'Visible in your portfolio on the website.' : 'Saved as a draft. Only you can see it.'}
            />
            <Toggle
              label="Feature on homepage"
              checked={values.isFeatured}
              disabled={!values.isPublished}
              onChange={(v) => set('isFeatured', v)}
              description={
                values.isPublished ? 'Adds it to the end of the homepage carousel. Reorder it under Homepage carousel.' : 'Publish this tattoo first to feature it.'
              }
            />
          </Card>

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-rule bg-paper/95 px-4 py-4 sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-[4px] sm:border sm:px-5">
            {saving ? (
              <div className="flex-1" role="status" aria-live="polite">
                <div className="flex justify-between text-[0.875rem] text-graphite-2">
                  <span>{progress! < 1 ? 'Uploading…' : 'Optimising photograph…'}</span>
                  <span className="tabular-nums">{Math.round(progress! * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
                  <div className="h-full bg-graphite transition-[width] duration-200" style={{ width: `${Math.round(progress! * 100)}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-[0.875rem] text-graphite-2">
                {editing && tattoo?.isPublished && (
                  <a href={`/work/${tattoo.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-graphite">
                    View on website <ExternalLink size={14} aria-hidden />
                  </a>
                )}
                {dirty && <span>Unsaved changes</span>}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => router.push('/admin/tattoos')} disabled={saving} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
                {editing ? 'Save changes' : values.isPublished ? 'Upload and publish' : 'Save draft'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
