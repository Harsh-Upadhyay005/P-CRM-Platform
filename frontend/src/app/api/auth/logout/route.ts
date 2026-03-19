import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api-base';

const BACKEND = getBackendApiBaseUrl();
const IS_PROD  = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  /* Forward all cookies so the backend can fully revoke the refresh token */
  const cookieHeader = req.headers.get('cookie') ?? '';

  try {
    await fetch(`${BACKEND}/auth/logout`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie':        cookieHeader,
      },
    });
  } catch {
    /* best-effort — clear frontend cookies regardless */
  }

  const clear = {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
    maxAge:   0,
  };

  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.set('accessToken',  '', { ...clear, path: '/' });
  response.cookies.set('refreshToken', '', { ...clear, path: '/api/auth' });
  return response;
}
