import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { ambilRekapAbsensi } from '@/lib/rekap-absensi';
import { gambarKop, gambarTabel, gambarRingkasan, tambahFooterSemuaHalaman, WARNA } from '@/lib/pdf-helpers';

export const dynamic = 'force-dynamic';

// GET /api/absensi/rekap/pdf?kelas_id=1&kategori=Wajib&dari=2026-08-01&sampai=2026-08-31
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kelasId = searchParams.get('kelas_id');
  const kategori = searchParams.get('kategori') || 'Wajib';
  const dari = searchParams.get('dari');
  const sampai = searchParams.get('sampai');

  if (!kelasId || !dari || !sampai) {
    return NextResponse.json({ error: 'kelas_id, dari, dan sampai wajib diisi' }, { status: 400 });
  }

  let kelasNama = '-', waliKelas: string | null = null, rows: any[] = [];
  try {
    const hasil = await ambilRekapAbsensi(kelasId, kategori, dari, sampai);
    kelasNama = hasil.kelasNama;
    waliKelas = hasil.waliKelas;
    rows = hasil.data;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const kategoriLabel = kategori === 'Wajib' ? 'Sholat Wajib' : kategori === 'Sunnah' ? 'Sholat Sunnah' : 'Kegiatan';

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    let y = gambarKop(doc, 'Rekap Absensi Santri', kategoriLabel, [
      { label: 'Kelas', nilai: kelasNama },
      { label: 'Wali Kelas', nilai: waliKelas || '-' },
      { label: 'Periode', nilai: `${dari} s.d. ${sampai}` }
    ]);

    y = gambarTabel(
      doc, y,
      [
        { label: 'No', lebar: 22, align: 'center' },
        { label: 'NIS', lebar: 55 },
        { label: 'Nama Santri', lebar: 130 },
        { label: 'Hadir', lebar: 42, align: 'center' },
        { label: 'Terlambat', lebar: 55, align: 'center' },
        { label: 'Alpa', lebar: 40, align: 'center' },
        { label: 'Izin', lebar: 40, align: 'center' },
        { label: 'Sakit', lebar: 40, align: 'center' },
        { label: 'Total', lebar: 45, align: 'center' },
        { label: '%', lebar: 49, align: 'center' }
      ],
      rows.map((r, i) => [
        String(i + 1), r.nis || '-', r.nama,
        String(r.hadir), String(r.terlambat), String(r.alpa), String(r.izin), String(r.sakit),
        String(r.total), `${r.persen}%`
      ]),
      { pesanKosong: 'Belum ada data absensi pada periode & kelas ini.' }
    );

    const totalHadir = rows.reduce((a, r) => a + r.hadir, 0);
    const totalCatatan = rows.reduce((a, r) => a + r.total, 0);
    const rataPersen = totalCatatan > 0 ? Math.round((totalHadir / totalCatatan) * 100) : 0;

    gambarRingkasan(doc, y, [
      { label: 'Jumlah Santri', nilai: String(rows.length) },
      { label: 'Rata-rata Kehadiran', nilai: `${rataPersen}%` },
      { label: 'Total Catatan', nilai: String(totalCatatan) }
    ]);

    tambahFooterSemuaHalaman(doc);
    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rekap-absensi-${kelasNama}-${dari}_${sampai}.pdf"`
    }
  });
}
