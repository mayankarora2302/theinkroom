import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = ['__Host-ir_session', 'ir_session'];

/**
 * Fast redirect for signed-out visitors. This is only a convenience: every admin API call is
 * independently authenticated and authorised by the Express backend.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Only admin pages — never /api, so large photo uploads are streamed straight to the API.
export const config = { matcher: ['/admin', '/admin/:path*'] };
