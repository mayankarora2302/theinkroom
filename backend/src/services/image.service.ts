import sharp, { type Metadata } from 'sharp';
import { HttpError } from '../utils/http-error.js';

sharp.cache(false);

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  blurDataUrl: string;
}

const invalid = (message: string) => new HttpError(422, 'UNSUPPORTED_MEDIA_TYPE', message);

/**
 * Validates the actual file contents (not just the declared MIME type) and produces
 * optimised WebP renditions: a large display image, a gallery thumbnail and a blur placeholder.
 */
export async function processImage(input: Buffer, opts: { maxEdge?: number; thumbEdge?: number } = {}): Promise<ProcessedImage> {
  const maxEdge = opts.maxEdge ?? 2400;
  const thumbEdge = opts.thumbEdge ?? 1000;

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 120_000_000 }).metadata();
  } catch {
    throw invalid('This file does not appear to be a valid image. Please upload a JPEG, PNG or WebP photograph.');
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw invalid('Please upload a JPEG, PNG or WebP photograph.');
  }
  if (!meta.width || !meta.height) throw invalid('The image dimensions could not be read.');

  // Any size is accepted: small photos are never enlarged, only re-encoded. The admin form
  // warns (without blocking) when a photo may look soft at large display sizes.

  const base = () => sharp(input, { limitInputPixels: 120_000_000 }).rotate();

  try {
    const [full, thumb, blur] = await Promise.all([
      base()
        .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84, effort: 5, smartSubsample: true })
        .toBuffer({ resolveWithObject: true }),
      base()
        .resize({ width: thumbEdge, height: thumbEdge, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78, effort: 5, smartSubsample: true })
        .toBuffer(),
      base().resize({ width: 20, height: 20, fit: 'inside' }).webp({ quality: 40 }).toBuffer(),
    ]);
    return {
      full: full.data,
      thumb,
      width: full.info.width,
      height: full.info.height,
      blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
    };
  } catch (err) {
    console.error('[image] processing failed', err);
    throw invalid('The photograph could not be processed. Try exporting it again as a JPEG.');
  }
}
