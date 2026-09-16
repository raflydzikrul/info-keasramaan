import { NextResponse } from 'next/server';
import { ambilRekapAbsensi } from '@/lib/rekap-absensi';

export const dynamic = 'force-dynamic';

// GET /api/absensi/rekap?kelas_id=1&kategori=Wajib&dari=2026-08-01&sampai=2026-08-31
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kelasId = searchParams.get('kelas_id');
  const kategori = searchParams.get('kategori') || 'Wajib';
  const dari = searchParams.get('dari');
  const sampai = searchParams.get('sampai');

  if (!kelasId || !dari || !sampai) {
    return NextResponse.json({ error: 'kelas_id, dari, dan sampai wajib diisi' }, { status: 400 });
  }

  try {
    const { kelasNama, data } = await ambilRekapAbsensi(kelasId, kategori, dari, sampai);
    return NextResponse.json({ kelas: kelasNama, kategori, dari, sampai, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
