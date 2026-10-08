import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import supabase from '@/lib/supabase';
import { isAreaAuthed } from '@/lib/area-auth';
import { awalBulanBerikutnya } from '@/lib/tanggal';
import { gambarKop, gambarTabel, gambarRingkasan, gambarJudulBagian, tambahFooterSemuaHalaman, WARNA, MARGIN, LEBAR_KONTEN, BATAS_BAWAH } from '@/lib/pdf-helpers';

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

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    let y = gambarKop(doc, 'Laporan Jurnal Piket Asrama', null, [
      { label: 'Periode', nilai: periodeLabel },
      { label: 'Shift', nilai: shift || 'Semua Shift' },
      { label: 'Status', nilai: status || 'Semua Status' }
    ]);

    y = gambarTabel(
      doc, y,
      [
        { label: 'No', lebar: 22, align: 'center' },
        { label: 'Tanggal', lebar: 62 },
        { label: 'Shift', lebar: 55 },
        { label: 'Petugas', lebar: 150 },
        { label: 'Hadir', lebar: 55, align: 'center' },
        { label: 'Status', lebar: 171 }
      ],
      rows.map((r: any, i: number) => [
        String(i + 1), r.tanggal, r.shift, r.petugas,
        r.jumlah_santri_hadir === null ? '-' : String(r.jumlah_santri_hadir),
        r.status
      ]),
      { pesanKosong: 'Tidak ada data jurnal pada periode & filter ini.' }
    );

    const jumlahPerluTindakLanjut = rows.filter((r: any) => r.status === 'Perlu Tindak Lanjut').length;
    y = gambarRingkasan(doc, y, [
      { label: 'Total Catatan', nilai: String(rows.length) },
      { label: 'Perlu Tindak Lanjut', nilai: String(jumlahPerluTindakLanjut) },
      { label: 'Selesai', nilai: String(rows.length - jumlahPerluTindakLanjut) }
    ]);

    // --- Detail lengkap untuk catatan yang Perlu Tindak Lanjut ---
    const perluTindakLanjut = rows.filter((r: any) => r.status === 'Perlu Tindak Lanjut');
    if (perluTindakLanjut.length > 0) {
      y = gambarJudulBagian(doc, y, 'Detail Catatan yang Perlu Tindak Lanjut');

      perluTindakLanjut.forEach((r: any, idx: number) => {
        if (y > BATAS_BAWAH - 60) { doc.addPage(); y = MARGIN; }

        // Kartu per-catatan dengan aksen merah di kiri (menandakan perlu perhatian)
        const estimasiTinggi = 70; // disesuaikan ulang di bawah kalau teks panjang
        doc.rect(MARGIN, y, 3, estimasiTinggi).fill(WARNA.merah);

        doc.fillColor(WARNA.hijauTua).font('Helvetica-Bold').fontSize(9.5)
          .text(`${r.tanggal}  ·  Shift ${r.shift}  ·  ${r.petugas}`, MARGIN + 12, y + 2, { width: LEBAR_KONTEN - 12 });
        let yDetail = doc.y + 6;

        doc.font('Helvetica').fontSize(8.8).fillColor('#374151');
        const tulisField = (label: string, isi: string | null) => {
          if (!isi) return;
          const teks = `${label}: ${isi}`;
          const tinggi = doc.heightOfString(teks, { width: LEBAR_KONTEN - 12 });
          if (yDetail + tinggi > BATAS_BAWAH) { doc.addPage(); yDetail = MARGIN; }
          doc.font('Helvetica-Bold').fontSize(8.8).fillColor(WARNA.teksSamar).text(`${label}:`, MARGIN + 12, yDetail, { continued: false });
          doc.font('Helvetica').fontSize(8.8).fillColor('#374151').text(isi, MARGIN + 12, doc.y, { width: LEBAR_KONTEN - 12 });
          yDetail = doc.y + 4;
        };
        tulisField('Kegiatan', r.kegiatan);
        tulisField('Kondisi Asrama', r.kondisi_asrama);
        tulisField('Kendala', r.kendala);
        tulisField('Tindak Lanjut', r.tindak_lanjut);

        y = yDetail + 10;
        if (idx < perluTindakLanjut.length - 1) {
          doc.moveTo(MARGIN, y - 4).lineTo(MARGIN + LEBAR_KONTEN, y - 4).lineWidth(0.5).strokeColor(WARNA.garis).stroke();
        }
      });
    }

    tambahFooterSemuaHalaman(doc);
    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laporan-piket-${bulan || tanggal || 'semua'}.pdf"`
    }
  });
}
