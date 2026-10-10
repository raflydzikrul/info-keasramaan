import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';
import { bacaFilter, validasiFilter, terapkanFilter, ambilSemua } from '@/lib/pelanggaran-query';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }

  const filter = bacaFilter(new URL(req.url).searchParams);
  const pesanFilter = validasiFilter(filter);
  if (pesanFilter) return NextResponse.json({ error: pesanFilter }, { status: 400 });

  const { data, error } = await ambilSemua(() =>
    terapkanFilter(
      supabase
        .from('pelanggaran')
        .select('*, siswa!inner(nama, nis, kelas_id, kelas(nama)), kategori_pelanggaran!inner(nama, tingkat)')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
      filter
    )
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((p: any) => ({
    id: p.id, siswa_id: p.siswa_id, kategori_id: p.kategori_id, tanggal: p.tanggal,
    keterangan: p.keterangan, poin: p.poin, petugas: p.petugas,
    nama_siswa: p.siswa?.nama, nis: p.siswa?.nis, nama_kelas: p.siswa?.kelas?.nama || null,
    nama_kategori: p.kategori_pelanggaran?.nama, tingkat: p.kategori_pelanggaran?.tingkat
  }));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }

  const body = await req.json();
  const { siswa_id, kategori_id, tanggal, keterangan, petugas } = body;
  if (!siswa_id || !kategori_id || !tanggal) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  const { data: kategori, error: e1 } = await supabase
    .from('kategori_pelanggaran').select('poin').eq('id', kategori_id).maybeSingle();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (!kategori) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });

  const { data, error } = await supabase
    .from('pelanggaran')
    .insert({ siswa_id, kategori_id, tanggal, keterangan: keterangan || null, poin: kategori.poin, petugas: petugas || null })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
