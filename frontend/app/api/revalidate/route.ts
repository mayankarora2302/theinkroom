import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

const ALLOWED = new Set(['tattoos', 'featured', 'settings']);

/** Called by the Express API after admin edits so the public pages refresh straight away. */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  const given = request.headers.get('x-revalidate-secret') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED.has(t)) : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
