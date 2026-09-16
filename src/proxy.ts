import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/auth/session';

/**
 * Next 16 renamed the middleware convention to `proxy`. Same API.
 *
 * This is an OPTIMISTIC check only — it keeps signed-out visitors from seeing an
 * admin screen flash. The authoritative check lives in the (panel) layout and in
 * every server action, so a bypassed proxy leaks nothing.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/rates') {
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return verifySession(token).then((session) => {
    if (session) return NextResponse.next();
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  });
}

export const config = {
  matcher: ['/admin((?!/login).*)', '/rates'],
};

