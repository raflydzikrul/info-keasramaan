import { NextResponse } from 'next/server';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';
import { bacaFilter, validasiFilter, ambilRekapPoin } from '@/lib/pelanggaran-query';

export const dynamic = 'force-dynamic';

// GET /api/pelanggaran/rekap?kelas_id=&tingkat=&bulan=YYYY-MM | &tanggal=YYYY-MM-DD | &dari=YYYY-MM-DD&sampai=YYYY-MM-DD
// Mengembalikan total poin pelanggaran per santri pada periode yang dipilih.
export async function GET(req: Request) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }

  const filter = bacaFilter(new URL(req.url).searchParams);
  const pesanFilter = validasiFilter(filter);
  if (pesanFilter) return NextResponse.json({ error: pesanFilter }, { status: 400 });

  try {
    const rows = await ambilRekapPoin(filter);
    return NextResponse.json({
      rows,
      ringkasan: {
        jumlah_santri: rows.length,
        total_kasus: rows.reduce((a, r) => a + r.jumlah_kasus, 0),
        total_poin: rows.reduce((a, r) => a + r.total_poin, 0)
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menghitung rekap poin' }, { status: 500 });
  }
}
