'use client';

import { ArrowUpRight, Check, Loader2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { SIZE_LABEL, whatsappLink } from '@/lib/format';
import type { TattooSize } from '@/lib/types';

type Method = 'WHATSAPP' | 'PHONE' | 'EMAIL';
type SizeChoice = TattooSize | 'UNSURE' | '';

interface Values {
  name: string;
  phone: string;
  email: string;
  idea: string;
  preferredSize: SizeChoice;
  placement: string;
  contactMethod: Method | '';
  website: string;
}

type Errors = Partial<Record<keyof Values | 'form', string>>;

interface Props {
  whatsappNumber: string;
  reference: { slug: string; title: string; size: TattooSize; url: string } | null;
}

const METHODS: Array<{ value: Method; label: string }> = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'PHONE', label: 'Phone call' },
  { value: 'EMAIL', label: 'Email' },
];
const SIZE_CHOICES: Array<{ value: SizeChoice; label: string; hint: string }> = [
  { value: 'SMALL', label: 'Small', hint: 'Up to palm-sized' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Forearm, calf' },
  { value: 'LARGE', label: 'Large', hint: 'Sleeve, back, thigh' },
  { value: 'UNSURE', label: 'Not sure', hint: 'Let’s discuss' },
];

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Please tell me your name.';
  if (!/^[+\d][\d\s()-]{6,22}$/.test(v.phone.trim())) e.phone = 'Enter a phone number I can reach you on, with country code if outside India.';
  if (!v.contactMethod) e.contactMethod = 'Choose how you would like to be contacted.';
  if (v.contactMethod === 'EMAIL' && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Add a valid email address, or choose another contact method.';
  if (v.idea.trim().length < 10) e.idea = 'A sentence or two about the idea helps — at least 10 characters.';
  if (v.idea.length > 2000) e.idea = 'Keep it under 2,000 characters — we can go into detail later.';
  if (v.placement.length > 80) e.placement = 'Keep this short, e.g. “left forearm”.';
  return e;
}

export function EnquiryForm({ whatsappNumber, reference }: Props) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({
    name: '',
    phone: '',
    email: '',
    idea: reference ? `I’d like something along the lines of “${reference.title}”. ` : '',
    preferredSize: reference?.size ?? '',
    placement: '',
    contactMethod: whatsappNumber ? 'WHATSAPP' : '',
    website: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const fid = (k: string) => `${uid}-${k}`;
  const describedBy = (k: keyof Values, hint = false) =>
    [hint ? fid(`${k}-hint`) : null, errors[k] ? fid(`${k}-error`) : null].filter(Boolean).join(' ') || undefined;

  const focusFirstError = (errs: Errors) => {
    const first = (Object.keys(errs) as Array<keyof Values>).find((k) => k !== ('form' as never));
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/v1/public/enquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...values,
          preferredSize: values.preferredSize || undefined,
          email: values.email || undefined,
          tattooSlug: reference?.slug,
        }),
      });
      if (res.ok) {
        setStatus('sent');
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: { message?: string; fields?: Record<string, string> } } | null;
      const fieldErrors = (body?.error?.fields ?? {}) as Errors;
      const next = { ...fieldErrors, form: body?.error?.message ?? 'Your enquiry could not be sent. Please try again.' };
      setErrors(next);
      focusFirstError(fieldErrors);
    } catch {
      setErrors({ form: 'You appear to be offline. Check your connection and try again.' });
    }
    setStatus('idle');
  }

  const whatsappMessage = [
    `Hi, I’m ${values.name.trim()}. I just sent an enquiry through the website.`,
    reference ? `Reference: “${reference.title}” — ${reference.url}` : null,
    `Idea: ${values.idea.trim()}`,
    values.preferredSize && values.preferredSize !== 'UNSURE' ? `Size: ${SIZE_LABEL[values.preferredSize]}` : null,
    values.placement.trim() ? `Placement: ${values.placement.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const wa = whatsappNumber ? whatsappLink(whatsappNumber, whatsappMessage) : null;

  if (status === 'sent') {
    return (
      <div role="status" className="border border-line-strong p-8 md:p-12">
        <span className="inline-flex h-11 w-11 items-center justify-center border border-accent text-accent-strong">
          <Check size={20} strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="text-display-m mt-8 text-bone">Thank you, {values.name.trim().split(' ')[0]}.</h2>
        <p className="mt-4 max-w-[46ch] text-bone-2">
          Your enquiry has been received. You will hear back
          {values.contactMethod === 'WHATSAPP' ? ' on WhatsApp' : values.contactMethod === 'EMAIL' ? ' by email' : ' by phone'} to talk it
          through.
        </p>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 inline-flex h-12 items-center gap-2.5 bg-bone px-6 text-[0.9375rem] font-medium text-ink"
          >
            Also send it on WhatsApp
            <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden />
          </a>
        )}
      </div>
    );
  }

  const input =
    'block w-full border-0 border-b border-line-strong bg-transparent px-0 py-3 text-[1.0625rem] text-bone placeholder:text-mute focus:border-bone focus:ring-0 focus:outline-none aria-[invalid=true]:border-[#d0806f]';
  const label = 'text-meta block text-bone-2';
  const errorCls = 'mt-2 text-[0.875rem] text-[#e0a090]';

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-describedby={errors.form ? fid('form-error') : undefined} className="space-y-10">
      {errors.form && (
        <p id={fid('form-error')} role="alert" className="border-l-2 border-[#d0806f] py-1 pl-4 text-[0.9375rem] text-[#e0a090]">
          {errors.form}
        </p>
      )}

      <div className="grid gap-10 sm:grid-cols-2">
        <div>
          <label htmlFor={fid('name')} className={label}>
            Name
          </label>
          <input
            id={fid('name')}
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy('name')}
            maxLength={80}
            className={input}
          />
          {errors.name && (
            <p id={fid('name-error')} className={errorCls}>
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={fid('phone')} className={label}>
            Contact number
          </label>
          <input
            id={fid('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy('phone')}
            maxLength={24}
            className={input}
          />
          {errors.phone && (
            <p id={fid('phone-error')} className={errorCls}>
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <fieldset aria-describedby={describedBy('contactMethod')}>
        <legend className={label}>Preferred way to reach you</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <label key={m.value} className="cursor-pointer">
              <input
                type="radio"
                name="contactMethod"
                value={m.value}
                checked={values.contactMethod === m.value}
                onChange={() => set('contactMethod', m.value)}
                className="peer sr-only"
              />
              <span className="inline-flex h-11 items-center border border-line-strong px-4 text-[0.9375rem] text-bone-2 transition-colors peer-checked:border-bone peer-checked:bg-bone peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong hover:text-bone">
                {m.label}
              </span>
            </label>
          ))}
        </div>
        {errors.contactMethod && (
          <p id={fid('contactMethod-error')} className={errorCls}>
            {errors.contactMethod}
          </p>
        )}
      </fieldset>

      {values.contactMethod === 'EMAIL' && (
        <div>
          <label htmlFor={fid('email')} className={label}>
            Email
          </label>
          <input
            id={fid('email')}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('email')}
            maxLength={160}
            className={input}
          />
          {errors.email && (
            <p id={fid('email-error')} className={errorCls}>
              {errors.email}
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor={fid('idea')} className={label}>
          Your tattoo idea
        </label>
        <p id={fid('idea-hint')} className="text-meta mt-1 text-mute">
          Subject, mood, any references you love, and whether it’s your first tattoo.
        </p>
        <textarea
          id={fid('idea')}
          name="idea"
          rows={5}
          value={values.idea}
          onChange={(e) => set('idea', e.target.value)}
          aria-invalid={Boolean(errors.idea)}
          aria-describedby={describedBy('idea', true)}
          maxLength={2000}
          className={`${input} resize-y leading-relaxed`}
        />
        <div className="mt-2 flex justify-between gap-4">
          {errors.idea ? (
            <p id={fid('idea-error')} className={errorCls.replace('mt-2 ', '')}>
              {errors.idea}
            </p>
          ) : (
            <span />
          )}
          <span className="text-meta shrink-0 text-mute tabular-nums">{values.idea.length} / 2000</span>
        </div>
      </div>

      <fieldset>
        <legend className={label}>Preferred size</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SIZE_CHOICES.map((s) => (
            <label key={s.value} className="cursor-pointer">
              <input
                type="radio"
                name="preferredSize"
                value={s.value}
                checked={values.preferredSize === s.value}
                onChange={() => set('preferredSize', s.value)}
                className="peer sr-only"
              />
              <span className="flex h-full flex-col border border-line-strong px-4 py-3 transition-colors peer-checked:border-bone peer-checked:bg-bone peer-checked:[&>*]:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong">
                <span className="text-[0.9375rem] text-bone">{s.label}</span>
                <span className="text-meta text-mute">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={fid('placement')} className={label}>
          Placement on the body <span className="text-mute">(optional)</span>
        </label>
        <input
          id={fid('placement')}
          name="placement"
          placeholder="e.g. inner forearm"
          value={values.placement}
          onChange={(e) => set('placement', e.target.value)}
          aria-invalid={Boolean(errors.placement)}
          aria-describedby={describedBy('placement')}
          maxLength={80}
          className={input}
        />
        {errors.placement && (
          <p id={fid('placement-error')} className={errorCls}>
            {errors.placement}
          </p>
        )}
      </div>

      {/* Honeypot: hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={fid('website')}>Website</label>
        <input id={fid('website')} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-meta max-w-[38ch] text-mute">Your details are only used to reply to this enquiry.</p>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex h-12 items-center justify-center gap-2.5 bg-bone px-7 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-white disabled:opacity-70"
        >
          {status === 'sending' ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden /> Sending
            </>
          ) : (
            <>
              Send enquiry <ArrowUpRight size={17} strokeWidth={1.5} aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
