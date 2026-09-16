import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isAreaAuthed } from '@/lib/area-auth';
import { awalBulanBerikutnya } from '@/lib/tanggal';

export const dynamic = 'force-dynamic';

const SHIFT_VALID = ['Pagi', 'Siang', 'Sore', 'Malam'];
const STATUS_VALID = ['Selesai', 'Perlu Tindak Lanjut'];

function tolakTanpaAkses() {
  return NextResponse.json(
    { error: 'Tidak memiliki akses. Masukkan password Jurnal Piket terlebih dahulu.' },
    { status: 401 }
  );
}

// GET /api/piket?bulan=2026-09 | ?tanggal=2026-09-15 | &shift=Pagi | &status=...
export async function GET(req: Request) {
  if (!isAreaAuthed('piket')) return tolakTanpaAkses();

  const { searchParams } = new URL(req.url);
  const bulan = searchParams.get('bulan');
  const tanggal = searchParams.get('tanggal');
  const shift = searchParams.get('shift');
  const status = searchParams.get('status');

  let query = supabase
    .from('jurnal_piket')
    .select('*')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  if (tanggal) query = query.eq('tanggal', tanggal);
  else if (bulan) query = query.gte('tanggal', `${bulan}-01`).lt('tanggal', awalBulanBerikutnya(bulan));
  if (shift) query = query.eq('shift', shift);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
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

  const { data, error } = await supabase
    .from('jurnal_piket')
    .insert({
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
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
