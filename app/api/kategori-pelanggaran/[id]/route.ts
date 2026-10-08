import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';

export const dynamic = 'force-dynamic';

const TINGKAT_VALID = ['Ringan', 'Sedang', 'Berat'];

function tolakTanpaAkses() {
  return NextResponse.json(
    { error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' },
    { status: 401 }
  );
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isKedisiplinanAuthed()) return tolakTanpaAkses();

  const body = await req.json().catch(() => ({}));
  const nama = String(body.nama || '').trim();
  const tingkat = String(body.tingkat || '');
  const poin = Number(body.poin);

  if (!nama || !tingkat) {
    return NextResponse.json({ error: 'Nama dan tingkat wajib diisi' }, { status: 400 });
  }
  if (!TINGKAT_VALID.includes(tingkat)) {
    return NextResponse.json({ error: `Tingkat "${tingkat}" tidak dikenali` }, { status: 400 });
  }
  if (!Number.isInteger(poin) || poin < 1) {
    return NextResponse.json({ error: 'Poin harus berupa angka bulat minimal 1' }, { status: 400 });
  }

  const { error } = await supabase
    .from('kategori_pelanggaran')
    .update({ nama, tingkat, poin })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isKedisiplinanAuthed()) return tolakTanpaAkses();

  const { error } = await supabase.from('kategori_pelanggaran').delete().eq('id', params.id);

  if (error) {
    // 23503 = foreign key violation: kategori masih dipakai oleh catatan pelanggaran
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Kategori ini tidak bisa dihapus karena masih dipakai oleh catatan pelanggaran santri. Ubah saja namanya, atau hapus dulu catatan pelanggaran yang memakainya.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
