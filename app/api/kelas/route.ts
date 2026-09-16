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
  const nama = String(body.nama || '').trim();
  if (!nama) return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 });

  // Cegah kelas duplikat (nama sama, tidak peduli besar/kecil huruf atau spasi
  // di depan/belakang) — ini penyebab siswa bisa "terpisah" ke kelas yang
  // kelihatannya sama padahal beda id di database.
  const { data: existing } = await supabase
    .from('kelas')
    .select('id, nama')
    .ilike('nama', nama);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: `Kelas "${nama}" sudah ada (terdaftar sebagai "${existing[0].nama}"). Gunakan nama lain atau pilih kelas yang sudah ada.` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('kelas')
    .insert({ nama, wali_kelas: body.wali_kelas || null })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
