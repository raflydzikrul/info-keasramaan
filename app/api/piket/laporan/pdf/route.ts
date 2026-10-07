import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import supabase from '@/lib/supabase';
import { isAreaAuthed } from '@/lib/area-auth';
import { awalBulanBerikutnya } from '@/lib/tanggal';

export const dynamic = 'force-dynamic';

// GET /api/piket/laporan/pdf?bulan=YYYY-MM | &tanggal=YYYY-MM-DD &shift=&status=
export async function GET(req: Request) {
  if (!isAreaAuthed('piket')) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password Jurnal Piket terlebih dahulu.' }, { status: 401 });
  }

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

  const rows = data || [];
  const periodeLabel = tanggal ? `Tanggal ${tanggal}` : bulan ? `Bulan ${bulan}` : 'Seluruh Periode';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).font('Helvetica-Bold').text('Laporan Jurnal Piket Asrama', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Periode    : ${periodeLabel}`);
    doc.text(`Shift      : ${shift || 'Semua Shift'}`);
    doc.text(`Status     : ${status || 'Semua Status'}`);
    doc.text(`Dicetak    : ${new Date().toLocaleString('id-ID')}`);
    doc.moveDown(1);

    // --- Tabel ringkasan ---
    const startX = 40;
    let y = doc.y;
    const colWidths = [22, 55, 45, 95, 60, 95]; // No, Tanggal, Shift, Petugas, Hadir, Status
    const headers = ['No', 'Tanggal', 'Shift', 'Petugas', 'Hadir', 'Status'];

    const drawRow = (values: string[], isHeader = false) => {
      let x = startX;
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      values.forEach((val, i) => {
        doc.text(val, x, y, { width: colWidths[i], align: i === 4 ? 'right' : 'left' });
        x += colWidths[i];
      });
      y += 18;
    };

    drawRow(headers, true);
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor('#999').stroke();
    y += 4;

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(10).text('Tidak ada data jurnal pada periode & filter ini.', startX, y);
      y += 20;
    }

    rows.forEach((r: any, i: number) => {
      if (y > 760) { doc.addPage(); y = 40; }
      drawRow([
        String(i + 1), r.tanggal, r.shift, r.petugas,
        r.jumlah_santri_hadir === null ? '-' : String(r.jumlah_santri_hadir),
        r.status
      ]);
    });

    const jumlahPerluTindakLanjut = rows.filter((r: any) => r.status === 'Perlu Tindak Lanjut').length;
    y += 10;
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor('#999').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(10).text(
      `Total: ${rows.length} catatan · ${jumlahPerluTindakLanjut} perlu tindak lanjut`,
      startX, y
    );
    y += 25;

    // --- Detail lengkap untuk catatan yang Perlu Tindak Lanjut ---
    const perluTindakLanjut = rows.filter((r: any) => r.status === 'Perlu Tindak Lanjut');
    if (perluTindakLanjut.length > 0) {
      if (y > 700) { doc.addPage(); y = 40; }
      doc.font('Helvetica-Bold').fontSize(12).text('Detail Catatan yang Perlu Tindak Lanjut', startX, y);
      y += 20;

      perluTindakLanjut.forEach((r: any) => {
        if (y > 700) { doc.addPage(); y = 40; }
        doc.font('Helvetica-Bold').fontSize(9.5).text(`${r.tanggal} · Shift ${r.shift} · ${r.petugas}`, startX, y);
        y += 15;
        doc.font('Helvetica').fontSize(9);
        const tulisField = (label: string, isi: string | null) => {
          if (!isi) return;
          const tinggi = doc.heightOfString(`${label}: ${isi}`, { width: 500 });
          if (y + tinggi > 780) { doc.addPage(); y = 40; }
          doc.text(`${label}: ${isi}`, startX, y, { width: 500 });
          y += tinggi + 4;
        };
        tulisField('Kegiatan', r.kegiatan);
        tulisField('Kondisi Asrama', r.kondisi_asrama);
        tulisField('Kendala', r.kendala);
        tulisField('Tindak Lanjut', r.tindak_lanjut);
        y += 10;
      });
    }

    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laporan-piket-${bulan || tanggal || 'semua'}.pdf"`
    }
  });
}
