import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { ambilRekapAbsensi } from '@/lib/rekap-absensi';

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

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const kategoriLabel = kategori === 'Wajib' ? 'Sholat Wajib' : kategori === 'Sunnah' ? 'Sholat Sunnah' : 'Kegiatan';

    doc.fontSize(16).font('Helvetica-Bold').text('Rekap Absensi Santri', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(kategoriLabel, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Kelas       : ${kelasNama}`);
    doc.text(`Wali Kelas  : ${waliKelas || '-'}`);
    doc.text(`Periode     : ${dari} s.d. ${sampai}`);
    doc.text(`Dicetak     : ${new Date().toLocaleString('id-ID')}`);
    doc.moveDown(1);

    const startX = 40;
    let y = doc.y;
    const colWidths = [22, 55, 125, 40, 45, 40, 40, 40, 42, 45];
    const headers = ['No', 'NIS', 'Nama Santri', 'Hadir', 'Terlambat', 'Alpa', 'Izin', 'Sakit', 'Total', '%'];

    const drawRow = (values: string[], isHeader = false) => {
      let x = startX;
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      values.forEach((val, i) => {
        doc.text(val, x, y, { width: colWidths[i], align: i >= 3 ? 'center' : 'left' });
        x += colWidths[i];
      });
      y += 18;
    };

    drawRow(headers, true);
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor('#999').stroke();
    y += 4;

    rows.forEach((r, i) => {
      if (y > 760) { doc.addPage(); y = 40; }
      drawRow([
        String(i + 1), r.nis || '-', r.nama,
        String(r.hadir), String(r.terlambat), String(r.alpa), String(r.izin), String(r.sakit),
        String(r.total), `${r.persen}%`
      ]);
    });

    const totalHadir = rows.reduce((a, r) => a + r.hadir, 0);
    const totalCatatan = rows.reduce((a, r) => a + r.total, 0);
    const rataPersen = totalCatatan > 0 ? Math.round((totalHadir / totalCatatan) * 100) : 0;

    y += 10;
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor('#999').stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(10).text(`Rata-rata kehadiran kelas: ${rataPersen}%`, startX, y);

    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rekap-absensi-${kelasNama}-${dari}_${sampai}.pdf"`
    }
  });
}
