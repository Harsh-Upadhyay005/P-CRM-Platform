import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const IS_PROD  = process.env.NODE_ENV === 'production';

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge,
});

function jwtMaxAge(token: string): number {
  try {
    const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded)) as { exp: number };
    return Math.max(1, Math.floor(exp - Date.now() / 1000));
  } catch {
    return 15 * 60;
  }
}

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
  /* Forward all cookies the browser sent — this includes the
     frontend-domain refreshToken (path: /api/auth) set at login. */
  const cookieHeader = req.headers.get('cookie') ?? '';

  const backendRes = await fetch(`${BACKEND}/auth/refresh`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie':        cookieHeader,
    },
  });

  const data = await backendRes.json();
  const response = NextResponse.json(data, { status: backendRes.status });

  if (data?.success) {
    /* Re-mirror the new accessToken */
    if (data.data?.accessToken) {
      response.cookies.set('accessToken', data.data.accessToken, {
        ...cookieOpts(jwtMaxAge(data.data.accessToken)),
        path: '/',
      });
    }

    /* Re-mirror the rotated refreshToken */
    const rt = extractRefreshToken(backendRes);
    if (rt) {
      response.cookies.set('refreshToken', rt, {
        ...cookieOpts(30 * 24 * 60 * 60),
        path: '/api/auth',
      });
    }
  }

  return response;
}
