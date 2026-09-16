import { NextResponse } from 'next/server';
import {
  AREA, checkPassword, createSessionToken, cookieName, isAreaValid, sessionMaxAge, areaSiapDipakai
} from '@/lib/area-auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/kedisiplinan atau /api/auth/piket -> buka kunci area
export async function POST(req: Request, { params }: { params: { area: string } }) {
  const area = params.area;
  if (!isAreaValid(area)) {
    return NextResponse.json({ error: 'Area tidak dikenali' }, { status: 404 });
  }

  if (!areaSiapDipakai(area)) {
    return NextResponse.json(
      { error: `Password untuk ${AREA[area].label} belum diatur. Isi ${AREA[area].envPassword} di environment variable.` },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');

  if (!checkPassword(area, password)) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(area), createSessionToken(area), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAge()
  });
  return res;
}

// DELETE -> kunci kembali area tersebut
export async function DELETE(_req: Request, { params }: { params: { area: string } }) {
  const area = params.area;
  if (!isAreaValid(area)) {
    return NextResponse.json({ error: 'Area tidak dikenali' }, { status: 404 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(area), '', { path: '/', maxAge: 0 });
  return res;
}
