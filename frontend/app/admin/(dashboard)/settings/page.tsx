'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ImageDropzone } from '@/components/admin/ImageDropzone';
import { Button, Card, ConfirmDialog, describedBy, ErrorBlock, Field, inputClass, LoadingBlock, PageHeader, useToast } from '@/components/admin/ui';
import { adminRequest, adminUpload, ApiError } from '@/lib/admin-api';
import type { AdminSettings, Faq, ProcessStep } from '@/lib/types';

interface Form {
  artistName: string;
  brandName: string;
  tagline: string;
  homepageIntroduction: string;
  biography: string;
  philosophy: string;
  experience: string;
  styles: string;
  phone: string;
  whatsappNumber: string;
  instagramUrl: string;
  contactEmail: string;
  location: string;
  portraitAlt: string;
  processSteps: ProcessStep[];
  faqs: Faq[];
  featuredLimit: number;
}

const toForm = (s: AdminSettings): Form => ({
  artistName: s.artistName,
  brandName: s.brandName,
  tagline: s.tagline,
  homepageIntroduction: s.homepageIntroduction,
  biography: s.biography,
  philosophy: s.philosophy,
  experience: s.experience,
  styles: s.styles.join(', '),
  phone: s.phone,
  whatsappNumber: s.whatsappNumber ? `+${s.whatsappNumber}` : '',
  instagramUrl: s.instagramUrl,
  contactEmail: s.contactEmail,
  location: s.location,
  portraitAlt: s.portrait?.alt ?? '',
  processSteps: s.processSteps,
  faqs: s.faqs,
  featuredLimit: s.featuredLimit,
});

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(() => {
    adminRequest<AdminSettings>('/settings')
      .then((s) => {
        setSettings(s);
        setForm(toForm(s));
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loadError) return <ErrorBlock message={loadError} onRetry={() => {
        setLoadError(null);
        load();
      }} />;
  if (!form || !settings) return <LoadingBlock />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        styles: form.styles
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        processSteps: form.processSteps.filter((s) => s.title.trim() || s.body.trim()),
        faqs: form.faqs.filter((f) => f.question.trim() || f.answer.trim()),
      };
      const saved = await adminRequest<AdminSettings>('/settings', { method: 'PUT', json: payload });
      setSettings(saved);
      setForm(toForm(saved));
      setDirty(false);
      toast('Website settings saved.');
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        setErrors(err.fields);
        const first = Object.keys(err.fields)[0]!.split('.')[0];
        document.getElementById(first!)?.focus();
        toast('Please check the highlighted fields.', 'error');
      } else {
        toast((err as Error).message, 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadPortrait() {
    if (!portraitFile || !form) return;
    setPortraitBusy(true);
    const fd = new FormData();
    fd.set('image', portraitFile);
    fd.set('portraitAlt', form.portraitAlt);
    try {
      const saved = await adminUpload<AdminSettings>('/settings/portrait', 'PUT', fd);
      setSettings(saved);
      setPortraitFile(null);
      toast('Portrait updated.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setPortraitBusy(false);
    }
  }

  async function removePortrait() {
    setPortraitBusy(true);
    try {
      const saved = await adminRequest<AdminSettings>('/settings/portrait', { method: 'DELETE' });
      setSettings(saved);
      setConfirmRemove(false);
      toast('Portrait removed.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setPortraitBusy(false);
    }
  }

  const text = (key: keyof Form, label: string, opts: { hint?: string; optional?: boolean; type?: string; placeholder?: string; max?: number } = {}) => (
    <Field label={label} htmlFor={key} hint={opts.hint} optional={opts.optional} error={errors[key]}>
      <input
        id={key}
        type={opts.type ?? 'text'}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={opts.placeholder}
        maxLength={opts.max}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={describedBy(key, { hint: Boolean(opts.hint), error: errors[key] })}
        className={inputClass}
      />
    </Field>
  );

  const area = (key: keyof Form, label: string, opts: { hint?: string; rows?: number; max?: number } = {}) => (
    <Field label={label} htmlFor={key} hint={opts.hint} optional error={errors[key]}>
      <textarea
        id={key}
        rows={opts.rows ?? 4}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        maxLength={opts.max}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={describedBy(key, { hint: Boolean(opts.hint), error: errors[key] })}
        className={`${inputClass} resize-y leading-relaxed`}
      />
    </Field>
  );

  const Section = ({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) => (
    <Card className="p-5 md:p-6">
      <h2 id={id} className="scroll-mt-20 text-[1.125rem] font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-[0.875rem] text-graphite-2">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  );

  const updateList = <T,>(key: 'processSteps' | 'faqs', fn: (list: T[]) => T[]) => set(key, fn(form[key] as unknown as T[]) as never);

  return (
    <>
      <PageHeader title="Website settings" description="The words and contact details shown across your website. Empty fields are simply hidden." />

      <form onSubmit={save} noValidate className="space-y-6 pb-28">
        {Section({
          title: 'Name',
          children: (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {text('brandName', 'Brand or studio name', { hint: 'Shown in the header and footer.', max: 80 })}
                {text('artistName', 'Your name', { optional: true, max: 80 })}
              </div>
              {text('tagline', 'Tagline', { optional: true, hint: 'One short line, shown under your name on the homepage.', max: 160 })}
            </>
          ),
        })}

        {Section({
          title: 'Homepage',
          children: area('homepageIntroduction', 'Introduction', { hint: 'Two or three sentences beside the homepage carousel.', rows: 3, max: 600 }),
        })}

        {Section({
          title: 'About you',
          description: 'Shown on the About page. Leave a box empty to hide that part.',
          children: (
            <>
              <div className="grid gap-5 md:grid-cols-[14rem_1fr]">
                <div>
                  <ImageDropzone
                    label="Portrait"
                    file={portraitFile}
                    currentUrl={settings.portrait?.url}
                    onChange={setPortraitFile}
                    aspect="aspect-[4/5]"
                  />
                </div>
                <div className="space-y-4">
                  {text('portraitAlt', 'Portrait description', { optional: true, hint: 'e.g. “The artist at work in the studio”.', max: 300 })}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={uploadPortrait} disabled={!portraitFile} loading={portraitBusy && Boolean(portraitFile)}>
                      {settings.portrait ? 'Save new portrait' : 'Upload portrait'}
                    </Button>
                    {settings.portrait && !portraitFile && (
                      <Button variant="ghost" onClick={() => setConfirmRemove(true)}>
                        Remove portrait
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {area('biography', 'Biography', { hint: 'Leave a blank line between paragraphs.', rows: 7, max: 6000 })}
              {area('philosophy', 'Philosophy', { hint: 'How you approach your work. The first sentence is shown on the homepage.', rows: 4, max: 2000 })}
              {area('experience', 'Experience and specialties', { hint: 'Only what you want to share — nothing is shown if empty.', rows: 3, max: 1500 })}
              {text('styles', 'Styles', { optional: true, hint: 'Separate with commas, e.g. Fine line, Blackwork, Botanical', max: 600 })}
            </>
          ),
        })}

        {Section({
          title: 'Contact',
          description: 'Used for the WhatsApp buttons, the footer and the Contact page.',
          children: (
            <div className="grid gap-5 sm:grid-cols-2">
              {text('whatsappNumber', 'WhatsApp number', { optional: true, type: 'tel', placeholder: '+91 98765 43210', hint: 'Include the country code.' })}
              {text('phone', 'Phone number', { optional: true, type: 'tel', placeholder: '+91 98765 43210' })}
              {text('instagramUrl', 'Instagram', { optional: true, placeholder: '@yourhandle', hint: 'Your handle or profile link.' })}
              {text('contactEmail', 'Email', { optional: true, type: 'email' })}
              <div className="sm:col-span-2">{area('location', 'Studio location', { hint: 'Area and city, or a full address.', rows: 2, max: 160 })}</div>
            </div>
          ),
        })}

        {Section({
          title: 'Process steps',
          description: 'Shown on the homepage (first four) and the Process page.',
          children: (
            <>
              {form.processSteps.map((s, i) => (
                <ListItem
                  key={i}
                  index={i}
                  count={form.processSteps.length}
                  label="Step"
                  onMove={(to) => updateList<ProcessStep>('processSteps', (l) => moveItem(l, i, to))}
                  onRemove={() => updateList<ProcessStep>('processSteps', (l) => l.filter((_, j) => j !== i))}
                >
                  <Field label="Title" htmlFor={`processSteps.${i}.title`} error={errors[`processSteps.${i}.title`]}>
                    <input
                      id={`processSteps.${i}.title`}
                      value={s.title}
                      maxLength={60}
                      onChange={(e) => updateList<ProcessStep>('processSteps', (l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Description" htmlFor={`processSteps.${i}.body`} error={errors[`processSteps.${i}.body`]}>
                    <textarea
                      id={`processSteps.${i}.body`}
                      rows={2}
                      value={s.body}
                      maxLength={600}
                      onChange={(e) => updateList<ProcessStep>('processSteps', (l) => l.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                </ListItem>
              ))}
              {form.processSteps.length < 8 && (
                <Button variant="secondary" onClick={() => updateList<ProcessStep>('processSteps', (l) => [...l, { title: '', body: '' }])}>
                  <Plus size={16} aria-hidden /> Add step
                </Button>
              )}
            </>
          ),
        })}

        {Section({
          title: 'Frequently asked questions',
          description: 'Shown on the Process & FAQ page.',
          children: (
            <>
              {form.faqs.map((f, i) => (
                <ListItem
                  key={i}
                  index={i}
                  count={form.faqs.length}
                  label="Question"
                  onMove={(to) => updateList<Faq>('faqs', (l) => moveItem(l, i, to))}
                  onRemove={() => updateList<Faq>('faqs', (l) => l.filter((_, j) => j !== i))}
                >
                  <Field label="Question" htmlFor={`faqs.${i}.question`} error={errors[`faqs.${i}.question`]}>
                    <input
                      id={`faqs.${i}.question`}
                      value={f.question}
                      maxLength={160}
                      onChange={(e) => updateList<Faq>('faqs', (l) => l.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Answer" htmlFor={`faqs.${i}.answer`} error={errors[`faqs.${i}.answer`]}>
                    <textarea
                      id={`faqs.${i}.answer`}
                      rows={3}
                      value={f.answer}
                      maxLength={1500}
                      onChange={(e) => updateList<Faq>('faqs', (l) => l.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                      className={`${inputClass} resize-y`}
                    />
                  </Field>
                </ListItem>
              ))}
              {form.faqs.length < 20 && (
                <Button variant="secondary" onClick={() => updateList<Faq>('faqs', (l) => [...l, { question: '', answer: '' }])}>
                  <Plus size={16} aria-hidden /> Add question
                </Button>
              )}
            </>
          ),
        })}

        {Section({
          id: 'carousel',
          title: 'Homepage carousel',
          children: (
            <Field label="Maximum number of featured tattoos" htmlFor="featuredLimit" hint="Between 1 and 12. Six to eight works well." error={errors.featuredLimit}>
              <input
                id="featuredLimit"
                type="number"
                min={1}
                max={12}
                value={form.featuredLimit}
                onChange={(e) => set('featuredLimit', Number(e.target.value))}
                aria-invalid={Boolean(errors.featuredLimit)}
                className={`${inputClass} w-28 tabular-nums`}
              />
            </Field>
          ),
        })}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-card/95 px-4 py-3 lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-[0.9375rem] text-graphite-2" aria-live="polite">
              {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </p>
            <div className="flex gap-2">
              {dirty && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setForm(toForm(settings));
                    setErrors({});
                    setDirty(false);
                  }}
                  disabled={saving}
                >
                  Discard
                </Button>
              )}
              <Button type="submit" loading={saving} disabled={!dirty}>
                Save settings
              </Button>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove your portrait?"
        message={<p>The About page will show a neutral placeholder until you upload a new one.</p>}
        confirmLabel="Remove"
        busy={portraitBusy}
        onConfirm={removePortrait}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  );
}

function moveItem<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function ListItem({
  index,
  count,
  label,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (to: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="relative rounded-[4px] border border-rule p-4">
      <legend className="float-left mb-3 h-9 text-[0.875rem] leading-9 font-medium text-graphite-2">
        {label} {index + 1}
      </legend>
      <div className="absolute top-4 right-3">
        <div className="flex">
          <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Move ${label.toLowerCase()} ${index + 1} up`} className="inline-flex h-9 w-9 items-center justify-center rounded text-graphite-2 hover:bg-paper-2 disabled:opacity-30">
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={() => onMove(index + 1)} disabled={index === count - 1} aria-label={`Move ${label.toLowerCase()} ${index + 1} down`} className="inline-flex h-9 w-9 items-center justify-center rounded text-graphite-2 hover:bg-paper-2 disabled:opacity-30">
            <ArrowDown size={16} />
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} className="inline-flex h-9 w-9 items-center justify-center rounded text-graphite-2 hover:bg-danger-soft hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="clear-left space-y-4">{children}</div>
    </fieldset>
  );
}
