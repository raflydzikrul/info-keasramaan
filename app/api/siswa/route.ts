import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kelasId = searchParams.get('kelas_id');
  const q = searchParams.get('q');

  let query = supabase.from('siswa').select('*, kelas(nama)').order('nama');
  if (kelasId) query = query.eq('kelas_id', kelasId);
  if (q) query = query.or(`nama.ilike.%${q}%,nis.ilike.%${q}%`);

  const { data: siswaList, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Total poin pelanggaran per siswa dihitung di JS (Supabase JS client tidak
  // mendukung GROUP BY langsung seperti SQL mentah)
  const { data: pelanggaranList } = await supabase.from('pelanggaran').select('siswa_id, poin');
  const poinMap = new Map<number, number>();
  (pelanggaranList || []).forEach((p: any) => {
    poinMap.set(p.siswa_id, (poinMap.get(p.siswa_id) || 0) + p.poin);
  });

  const rows = (siswaList || []).map((s: any) => ({
    ...s,
    nama_kelas: s.kelas?.nama || null,
    total_poin_pelanggaran: poinMap.get(s.id) || 0
  }));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.nama) return NextResponse.json({ error: 'Nama siswa wajib diisi' }, { status: 400 });

  const { data, error } = await supabase
    .from('siswa')
    .insert({
      nis: body.nis || null,
      nama: body.nama,
      kelas_id: body.kelas_id || null,
      jk: body.jk || 'L',
      status: body.status || 'Aktif'
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
