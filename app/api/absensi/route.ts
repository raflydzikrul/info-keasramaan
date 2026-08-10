import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/absensi?kelas_id=1&tanggal=2026-08-09
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kelasId = searchParams.get('kelas_id');
  const tanggal = searchParams.get('tanggal');

  if (!kelasId || !tanggal) {
    return NextResponse.json({ error: 'kelas_id dan tanggal wajib diisi' }, { status: 400 });
  }

  const { data: siswa, error: e1 } = await supabase
    .from('siswa')
    .select('id, nis, nama')
    .eq('kelas_id', kelasId)
    .eq('status', 'Aktif')
    .order('nama');
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: jenis, error: e2 } = await supabase.from('jenis_absensi').select('*').order('urutan');
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const siswaIds = (siswa || []).map((s: any) => s.id);
  let existing: any[] = [];
  if (siswaIds.length > 0) {
    const { data } = await supabase
      .from('absensi')
      .select('siswa_id, jenis_id, status, keterangan')
      .eq('tanggal', tanggal)
      .in('siswa_id', siswaIds);
    existing = data || [];
  }

  return NextResponse.json({ siswa, jenis, existing });
}

// POST body: { tanggal, entries: [{siswa_id, jenis_id, status, keterangan}] }
export async function POST(req: Request) {
  const body = await req.json();
  const { tanggal, entries } = body;
  if (!tanggal || !Array.isArray(entries)) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  const rows = entries.map((r: any) => ({
    siswa_id: r.siswa_id,
    jenis_id: r.jenis_id,
    tanggal,
    status: r.status || 'Hadir',
    keterangan: r.keterangan || null
  }));

  const { error } = await supabase
    .from('absensi')
    .upsert(rows, { onConflict: 'siswa_id,jenis_id,tanggal' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jumlah: entries.length });
}
