import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api-base';

const BACKEND = getBackendApiBaseUrl();
const IS_PROD  = process.env.NODE_ENV === 'production';

/** Shared cookie options for mirroring tokens on the frontend domain */
const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge,
});

/** Parse seconds-until-expiry from a JWT exp claim */
function jwtMaxAge(token: string): number {
  try {
    const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded)) as { exp: number };
    return Math.max(1, Math.floor(exp - Date.now() / 1000));
  } catch {
    return 15 * 60; // fallback 15 min
  }
}

/**
 * Parse the refreshToken value from the backend's Set-Cookie headers.
 * node 18+ `Response` supports `.headers.getSetCookie()` (array);
 * older runtimes fall back to the comma-joined `.get('set-cookie')`.
 */
function extractRefreshToken(backendRes: Response): string | null {
  const headers: string[] =
    typeof (backendRes.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? ((backendRes.headers as unknown as { getSetCookie: () => string[] }).getSetCookie())
      : (backendRes.headers.get('set-cookie') ?? '').split(/,(?=\s*\w+=)/);

  for (const h of headers) {
    const match = h.trim().match(/^refreshToken=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const backendRes = await fetch(`${BACKEND}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await backendRes.json();
  const response = NextResponse.json(data, { status: backendRes.status });

  if (data?.success) {
    /* Mirror accessToken — needed so proxy.ts middleware can gate protected routes */
    if (data.data?.accessToken) {
      response.cookies.set('accessToken', data.data.accessToken, {
        ...cookieOpts(jwtMaxAge(data.data.accessToken)),
        path: '/',
      });
    }

    /* Mirror refreshToken — scoped to /api/auth so it is forwarded to
       the refresh proxy route but not exposed to all frontend requests */
    const rt = extractRefreshToken(backendRes);
    if (rt) {
      response.cookies.set('refreshToken', rt, {
        ...cookieOpts(30 * 24 * 60 * 60), // 30 days — matches typical refresh expiry
        path: '/api/auth',
      });
    }
  }

  return response;
}
