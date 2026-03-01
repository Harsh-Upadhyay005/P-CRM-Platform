import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Decode JWT payload without a library (works in Edge runtime). */
function isTokenExpired(token: string): boolean {
  try {
    const [, rawPayload] = token.split('.');
    if (!rawPayload) return true;

    // JWT uses base64url; normalize before decoding.
    const base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));

    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function middleware(request: NextRequest) {
  const rawToken = request.cookies.get('accessToken');
  // Treat an expired token the same as no token
  const token = rawToken && !isTokenExpired(rawToken.value) ? rawToken : null;
  // Define protected routes
  const isProtectedPath = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/complaints') ||
    request.nextUrl.pathname.startsWith('/users') ||
    request.nextUrl.pathname.startsWith('/departments') ||
    request.nextUrl.pathname.startsWith('/analytics') ||
    request.nextUrl.pathname.startsWith('/notifications') ||
    request.nextUrl.pathname.startsWith('/audit-logs') ||
    request.nextUrl.pathname.startsWith('/tenants') ||
    request.nextUrl.pathname.startsWith('/profile');

  // If trying to access protected route without token, redirect to login
  if (isProtectedPath && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If trying to access auth pages (login/register) with token, redirect to dashboard
  const isAuthPage = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password');

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - track (public tracking pages)
     * - portal (public portal pages)
     * - feedback (public feedback pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|track|portal|feedback).*)',
  ],
};
