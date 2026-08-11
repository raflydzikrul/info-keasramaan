import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, KD_COOKIE_NAME } from '@/lib/kedisiplinan-auth';

export const dynamic = 'force-dynamic';

// POST { password } -> set cookie sesi kalau password benar
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = body.password || '';

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 });
  }

  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KD_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 // 8 jam
  });
  return res;
}

// DELETE -> keluar / kunci lagi halaman kedisiplinan
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KD_COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
