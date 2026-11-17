'use client';

import { ImagePlus, RefreshCw } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 15);
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
/** Below this (shortest side, px) the form warns that the photo may look soft when shown large. */
const SHARP_EDGE = 1000;

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    img.src = url;
  });
}

/**
 * Checks a chosen file before upload. `error` blocks the upload; `warning` is advice only.
 * The server validates again independently.
 */
export async function validateImageFile(file: File): Promise<{ error: string | null; warning: string | null }> {
  if (!ACCEPTED.includes(file.type))
    return { error: 'Please choose a JPEG, PNG or WebP photograph. (iPhone HEIC photos: export or share them as JPEG first.)', warning: null };
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    return { error: `This photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_MB} MB — try exporting a smaller version.`, warning: null };
  try {
    const { width, height } = await readDimensions(file);
    if (Math.min(width, height) < SHARP_EDGE) {
      return {
        error: null,
        warning: `This photo is fairly small (${width}×${height}px), so it may look soft when shown large. It will still upload — use a bigger version if you have one.`,
      };
    }
  } catch {
    return { error: 'This file could not be opened as an image.', warning: null };
  }
  return { error: null, warning: null };
}

interface Props {
  file: File | null;
  currentUrl?: string;
  onChange: (file: File | null) => void;
  error?: string;
  label?: string;
  aspect?: string;
}

export function ImageDropzone({ file, currentUrl, onChange, error, label = 'Tattoo photograph', aspect = 'aspect-[4/5]' }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function accept(f: File | undefined) {
    if (!f) return;
    const { error: problem, warning: advice } = await validateImageFile(f);
    setLocalError(problem);
    setWarning(problem ? null : advice);
    if (!problem) onChange(f);
  }

  const shown = preview ?? currentUrl ?? null;
  const message = localError ?? error;

  return (
    <div>
      <p id={`${id}-label`} className="text-[0.9375rem] font-medium text-graphite">
        {label}
      </p>
      <p className="mt-1 text-[0.8125rem] text-graphite-2">
        JPEG, PNG or WebP, up to {MAX_UPLOAD_MB} MB. It will be optimised automatically — upload the best-quality version you have.
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void accept(e.dataTransfer.files[0]);
        }}
        className={`relative mt-2 overflow-hidden rounded-[4px] border-2 border-dashed transition-colors ${
          dragging ? 'border-graphite bg-paper-2' : message ? 'border-danger' : 'border-rule bg-card'
        }`}
      >
        {shown ? (
          <div className={`relative ${aspect} bg-paper-2`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={shown} alt="Preview of the selected photograph" className="absolute inset-0 h-full w-full object-contain" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            aria-describedby={message ? `${id}-error` : undefined}
            className={`flex w-full flex-col items-center justify-center gap-3 px-6 text-center ${aspect} max-h-[26rem]`}
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-graphite">
              <ImagePlus size={22} aria-hidden />
            </span>
            <span className="font-medium text-graphite">Choose a photograph</span>
            <span className="text-[0.875rem] text-graphite-2">or drag and drop it here</span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(',')}
          aria-labelledby={`${id}-label`}
          className="sr-only"
          onChange={(e) => {
            void accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {shown && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-rule bg-card px-3 text-[0.875rem] font-medium hover:border-graphite-2"
          >
            <RefreshCw size={15} aria-hidden /> {file || currentUrl ? 'Replace photograph' : 'Choose photograph'}
          </button>
          {file && (
            <span className="truncate text-[0.8125rem] text-graphite-2">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              {currentUrl ? ' — will replace the current photo when you save' : ''}
            </span>
          )}
          {file && currentUrl && (
            <button type="button" onClick={() => onChange(null)} className="text-[0.8125rem] text-graphite-2 underline underline-offset-2">
              Keep current photo
            </button>
          )}
        </div>
      )}
      {message && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.875rem] text-danger">
          {message}
        </p>
      )}
      {!message && file && warning && (
        <p role="status" className="mt-2 rounded-[3px] bg-warn-soft px-3 py-2 text-[0.8125rem] leading-snug text-[#6b4f1a]">
          {warning}
        </p>
      )}
    </div>
  );
}
