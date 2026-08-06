import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'ms_session';

/**
 * Cheap edge gate: bounce anonymous requests to /login before they hit a
 * server component. This is a convenience, NOT the security boundary — the
 * authoritative checks (session validity, tenant, module, role) run in
 * `(app)/layout.tsx` and in each page's `requireModule` / `requireSuperAdmin`
 * call, because only those can reach the database.
 */
export function middleware(request: NextRequest) {
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!hasCookie && pathname !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
