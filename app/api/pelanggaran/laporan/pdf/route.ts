import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';
import { awalBulanBerikutnya } from '@/lib/tanggal';

export const dynamic = 'force-dynamic';

// GET /api/pelanggaran/laporan/pdf?tingkat=&kelas_id=&bulan=YYYY-MM | &tanggal=YYYY-MM-DD
export async function GET(req: Request) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tingkat = searchParams.get('tingkat');
  const kelasId = searchParams.get('kelas_id');
  const bulan = searchParams.get('bulan');
  const tanggal = searchParams.get('tanggal');

  let query = supabase
    .from('pelanggaran')
    .select('tanggal, poin, keterangan, petugas, siswa!inner(nama, nis, kelas_id, kelas(nama)), kategori_pelanggaran!inner(nama, tingkat)')
    .order('tanggal', { ascending: false });

  if (kelasId) query = query.eq('siswa.kelas_id', kelasId);
  if (tingkat) query = query.eq('kategori_pelanggaran.tingkat', tingkat);
  if (tanggal) query = query.eq('tanggal', tanggal);
  else if (bulan) query = query.gte('tanggal', `${bulan}-01`).lt('tanggal', awalBulanBerikutnya(bulan));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((p: any) => ({
    tanggal: p.tanggal,
    nama_siswa: p.siswa?.nama,
    nama_kelas: p.siswa?.kelas?.nama || '-',
    nama_kategori: p.kategori_pelanggaran?.nama,
    tingkat: p.kategori_pelanggaran?.tingkat,
    poin: p.poin,
    petugas: p.petugas || '-'
  }));

  // Nama kelas untuk judul laporan (kalau difilter per kelas)
  let namaKelas = 'Semua Kelas';
  if (kelasId) {
    const { data: k } = await supabase.from('kelas').select('nama').eq('id', kelasId).maybeSingle();
    namaKelas = k?.nama || 'Semua Kelas';
  }

  const periodeLabel = tanggal ? `Tanggal ${tanggal}` : bulan ? `Bulan ${bulan}` : 'Seluruh Periode';
  const tingkatLabel = tingkat || 'Semua Tingkat';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).font('Helvetica-Bold').text('Laporan Pelanggaran Santri', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Kelas      : ${namaKelas}`);
    doc.text(`Tingkat    : ${tingkatLabel}`);
    doc.text(`Periode    : ${periodeLabel}`);
    doc.text(`Dicetak    : ${new Date().toLocaleString('id-ID')}`);
    doc.moveDown(1);

    const startX = 40;
    let y = doc.y;
    const colWidths = [22, 55, 115, 70, 110, 60, 45]; // No, Tanggal, Nama, Kelas, Kategori, Tingkat, Poin
    const headers = ['No', 'Tanggal', 'Nama Santri', 'Kelas', 'Kategori', 'Tingkat', 'Poin'];

    const drawRow = (values: string[], isHeader = false) => {
      let x = startX;
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      values.forEach((val, i) => {
        doc.text(val, x, y, { width: colWidths[i], align: i >= 6 ? 'right' : 'left' });
        x += colWidths[i];
      });
      y += 18;
    };

    drawRow(headers, true);
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor('#999').stroke();
    y += 4;

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(10).text('Tidak ada data pelanggaran pada periode & filter ini.', startX, y);
      y += 20;
    }

    rows.forEach((r, i) => {
      if (y > 760) { doc.addPage(); y = 40; }
      drawRow([
        String(i + 1), r.tanggal, r.nama_siswa, r.nama_kelas,
        r.nama_kategori, r.tingkat, String(r.poin)
      ]);
    });

    // Ringkasan
    const totalKasus = rows.length;
    const totalPoin = rows.reduce((a, r) => a + r.poin, 0);
    const perTingkat = { Ringan: 0, Sedang: 0, Berat: 0 } as Record<string, number>;
    rows.forEach((r) => { if (perTingkat[r.tingkat] !== undefined) perTingkat[r.tingkat]++; });

    y += 10;
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor('#999').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(10).text(
      `Total: ${totalKasus} kasus · ${totalPoin} poin  (Ringan: ${perTingkat.Ringan}, Sedang: ${perTingkat.Sedang}, Berat: ${perTingkat.Berat})`,
      startX, y
    );

    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laporan-pelanggaran-${bulan || tanggal || 'semua'}.pdf"`
    }
  });
}
