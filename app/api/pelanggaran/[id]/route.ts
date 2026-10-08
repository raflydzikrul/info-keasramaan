import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';

export const dynamic = 'force-dynamic';

function tolakTanpaAkses() {
  return NextResponse.json(
    { error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' },
    { status: 401 }
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isKedisiplinanAuthed()) return tolakTanpaAkses();

  const { data, error } = await supabase
    .from('pelanggaran')
    .select('*, siswa(nama, nis, kelas_id, kelas(nama)), kategori_pelanggaran(nama, tingkat)')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Catatan pelanggaran tidak ditemukan' }, { status: 404 });

  return NextResponse.json({
    id: data.id, siswa_id: data.siswa_id, kategori_id: data.kategori_id, tanggal: data.tanggal,
    keterangan: data.keterangan, poin: data.poin, petugas: data.petugas,
    nama_siswa: data.siswa?.nama, nis: data.siswa?.nis, kelas_id: data.siswa?.kelas_id,
    nama_kelas: data.siswa?.kelas?.nama || null,
    nama_kategori: data.kategori_pelanggaran?.nama, tingkat: data.kategori_pelanggaran?.tingkat
  });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isKedisiplinanAuthed()) return tolakTanpaAkses();

  const body = await req.json().catch(() => ({}));
  const { siswa_id, kategori_id, tanggal, keterangan, petugas } = body;
  if (!siswa_id || !kategori_id || !tanggal) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
  }

  // Poin mengikuti kategori yang dipilih (bukan nilai manual), supaya tetap
  // konsisten dengan master kategori — sama seperti perilaku saat input baru.
  const { data: kategori, error: e1 } = await supabase
    .from('kategori_pelanggaran').select('poin').eq('id', kategori_id).maybeSingle();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (!kategori) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });

  const { error } = await supabase
    .from('pelanggaran')
    .update({
      siswa_id, kategori_id, tanggal,
      keterangan: keterangan || null,
      petugas: petugas || null,
      poin: kategori.poin
    })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isKedisiplinanAuthed()) return tolakTanpaAkses();

  const { error } = await supabase.from('pelanggaran').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
