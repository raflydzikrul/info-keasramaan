import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isAreaAuthed } from '@/lib/area-auth';

export const dynamic = 'force-dynamic';

const SHIFT_VALID = ['Pagi', 'Siang', 'Sore', 'Malam'];
const STATUS_VALID = ['Selesai', 'Perlu Tindak Lanjut'];

function tolakTanpaAkses() {
  return NextResponse.json(
    { error: 'Tidak memiliki akses. Masukkan password Jurnal Piket terlebih dahulu.' },
    { status: 401 }
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isAreaAuthed('piket')) return tolakTanpaAkses();

  const { data, error } = await supabase
    .from('jurnal_piket')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Catatan jurnal tidak ditemukan' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isAreaAuthed('piket')) return tolakTanpaAkses();

  const body = await req.json().catch(() => ({}));
  const tanggal = String(body.tanggal || '').trim();
  const shift = String(body.shift || '').trim();
  const petugas = String(body.petugas || '').trim();

  if (!tanggal || !shift || !petugas) {
    return NextResponse.json({ error: 'Tanggal, shift, dan nama petugas wajib diisi' }, { status: 400 });
  }
  if (!SHIFT_VALID.includes(shift)) {
    return NextResponse.json({ error: `Shift "${shift}" tidak dikenali` }, { status: 400 });
  }
  const status = String(body.status || 'Selesai');
  if (!STATUS_VALID.includes(status)) {
    return NextResponse.json({ error: `Status "${status}" tidak dikenali` }, { status: 400 });
  }

  const { error } = await supabase
    .from('jurnal_piket')
    .update({
      tanggal,
      shift,
      petugas,
      kegiatan: body.kegiatan?.trim() || null,
      kondisi_asrama: body.kondisi_asrama?.trim() || null,
      kendala: body.kendala?.trim() || null,
      tindak_lanjut: body.tindak_lanjut?.trim() || null,
      jumlah_santri_hadir: body.jumlah_santri_hadir === '' || body.jumlah_santri_hadir === null || body.jumlah_santri_hadir === undefined
        ? null
        : Number(body.jumlah_santri_hadir),
      status
    })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAreaAuthed('piket')) return tolakTanpaAkses();

  const { error } = await supabase.from('jurnal_piket').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
