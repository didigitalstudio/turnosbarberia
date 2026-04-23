import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LAST_SHOP_COOKIE } from '@/lib/shop-context';

export async function middleware(request: NextRequest) {
  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch (err) {
    // Never let session refresh fail the entire request.
    console.error('[middleware] updateSession failed', err);
    response = NextResponse.next({ request });
  }

  // Track last-visited shop for the root redirect.
  const match = request.nextUrl.pathname.match(/^\/s\/([^/]+)(?:\/|$)/);
  if (match) {
    const slug = match[1];
    if (request.cookies.get(LAST_SHOP_COOKIE)?.value !== slug) {
      response.cookies.set(LAST_SHOP_COOKIE, slug, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax'
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all pages except static assets, images, _next internals.
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)'
  ]
};
