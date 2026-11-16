/**
 * Development helper: creates clearly-labelled, neutral placeholder entries so the layout can be
 * reviewed before real photography is uploaded. They are NOT portfolio work.
 *
 *   npm run seed:placeholders            # create 10 placeholders (published, 5 featured)
 *   npm run seed:placeholders -- --clear # remove every placeholder entry and its files
 *
 * Placeholders are identified by the "placeholder-" slug prefix.
 */
import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import { processImage } from '../services/image.service.js';
import { getSettingsRow } from '../services/settings.service.js';
import { storage } from '../services/storage.service.js';
import { randomUUID } from 'node:crypto';

const PREFIX = 'placeholder-';

const SHAPES: Array<{ w: number; h: number }> = [
  { w: 1600, h: 2000 },
  { w: 1500, h: 2000 },
  { w: 1800, h: 1800 },
  { w: 2100, h: 1400 },
  { w: 1600, h: 2000 },
  { w: 1500, h: 2000 },
  { w: 1800, h: 1800 },
  { w: 1600, h: 2000 },
  { w: 2100, h: 1400 },
  { w: 1500, h: 2000 },
];
const TONES = ['#2b2825', '#3b3631', '#4a443d', '#57504a', '#34302c', '#625a51', '#2f2c29', '#453f39', '#5a534b', '#3d3833'];
const SIZES = ['SMALL', 'MEDIUM', 'LARGE'] as const;

function svg(i: number, { w, h }: { w: number; h: number }) {
  const tone = TONES[i % TONES.length];
  const line = 'rgba(234,230,222,0.22)';
  const cx = w * (0.38 + (i % 3) * 0.12);
  const cy = h * (0.42 + (i % 2) * 0.1);
  const r = Math.min(w, h) * (0.22 + (i % 4) * 0.04);
  const n = String(i + 1).padStart(2, '0');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${tone}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${line}" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="${line}" stroke-width="2"/>
  <line x1="${w * 0.08}" y1="${h * 0.86}" x2="${w * 0.92}" y2="${h * 0.14}" stroke="${line}" stroke-width="2"/>
  <text x="${w * 0.06}" y="${h - w * 0.06}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w * 0.028)}" fill="rgba(234,230,222,0.55)">Placeholder ${n} — replace with real photograph</text>
</svg>`);
}

async function clear() {
  const items = await prisma.tattoo.findMany({ where: { slug: { startsWith: PREFIX } } });
  for (const t of items) {
    await prisma.tattoo.delete({ where: { id: t.id } });
    await storage.remove([t.imagePath, t.thumbPath]);
  }
  console.log(`Removed ${items.length} placeholder entries.`);
}

async function create() {
  await storage.init();
  const settings = await getSettingsRow();
  const existing = await prisma.tattoo.count({ where: { slug: { startsWith: PREFIX } } });
  if (existing) {
    console.log(`${existing} placeholders already exist. Run with --clear first to recreate them.`);
    return;
  }
  const featureCount = Math.min(5, settings.featuredLimit);
  for (let i = 0; i < SHAPES.length; i++) {
    const shape = SHAPES[i]!;
    const png = await sharp(svg(i, shape)).png().toBuffer();
    const img = await processImage(png);
    const id = randomUUID();
    const imagePath = `tattoos/${id}/placeholder-full.webp`;
    const thumbPath = `tattoos/${id}/placeholder-thumb.webp`;
    await storage.upload(imagePath, img.full, 'image/webp');
    await storage.upload(thumbPath, img.thumb, 'image/webp');
    const n = String(i + 1).padStart(2, '0');
    await prisma.tattoo.create({
      data: {
        id,
        slug: `${PREFIX}${n}`,
        title: `Placeholder ${n}`,
        description: 'Development placeholder. Replace this entry with a real photograph and description from Admin → Tattoos.',
        imagePath,
        thumbPath,
        imageWidth: img.width,
        imageHeight: img.height,
        blurDataUrl: img.blurDataUrl,
        imageAlt: `Neutral placeholder image ${n}`,
        size: SIZES[i % 3]!,
        estimatedPrice: null,
        isPublished: true,
        isFeatured: i < featureCount,
        featuredOrder: i < featureCount ? i : null,
        // Stagger creation dates so ordering is visible.
        createdAt: new Date(Date.now() - i * 86_400_000),
      },
    });
    process.stdout.write('.');
  }
  console.log(`\nCreated ${SHAPES.length} placeholders (${featureCount} featured). Remove them with --clear.`);
}

(process.argv.includes('--clear') ? clear() : create())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
