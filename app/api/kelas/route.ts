import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: kelas, error } = await supabase.from('kelas').select('*').order('nama');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: siswaList } = await supabase.from('siswa').select('kelas_id');
  const jumlahMap = new Map<number, number>();
  (siswaList || []).forEach((s: any) => {
    if (s.kelas_id) jumlahMap.set(s.kelas_id, (jumlahMap.get(s.kelas_id) || 0) + 1);
  });

  const rows = (kelas || []).map((k: any) => ({ ...k, jumlah_siswa: jumlahMap.get(k.id) || 0 }));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.nama) return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 });

  const { data, error } = await supabase
    .from('kelas')
    .insert({ nama: body.nama, wali_kelas: body.wali_kelas || null })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
