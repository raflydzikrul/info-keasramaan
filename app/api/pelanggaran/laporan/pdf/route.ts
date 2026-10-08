import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';
import { awalBulanBerikutnya } from '@/lib/tanggal';
import { gambarKop, gambarTabel, gambarRingkasan, tambahFooterSemuaHalaman } from '@/lib/pdf-helpers';

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

  let namaKelas = 'Semua Kelas';
  if (kelasId) {
    const { data: k } = await supabase.from('kelas').select('nama').eq('id', kelasId).maybeSingle();
    namaKelas = k?.nama || 'Semua Kelas';
  }

  const periodeLabel = tanggal ? `Tanggal ${tanggal}` : bulan ? `Bulan ${bulan}` : 'Seluruh Periode';
  const tingkatLabel = tingkat || 'Semua Tingkat';

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    let y = gambarKop(doc, 'Laporan Pelanggaran Santri', null, [
      { label: 'Kelas', nilai: namaKelas },
      { label: 'Tingkat', nilai: tingkatLabel },
      { label: 'Periode', nilai: periodeLabel }
    ]);

    y = gambarTabel(
      doc, y,
      [
        { label: 'No', lebar: 22, align: 'center' },
        { label: 'Tanggal', lebar: 58 },
        { label: 'Nama Santri', lebar: 110 },
        { label: 'Kelas', lebar: 35 },
        { label: 'Kategori', lebar: 175 },
        { label: 'Tingkat', lebar: 60 },
        { label: 'Poin', lebar: 55, align: 'center' }
      ],
      rows.map((r, i) => [
        String(i + 1), r.tanggal, r.nama_siswa, r.nama_kelas,
        r.nama_kategori, r.tingkat, String(r.poin)
      ]),
      { pesanKosong: 'Tidak ada data pelanggaran pada periode & filter ini.' }
    );

    const totalKasus = rows.length;
    const totalPoin = rows.reduce((a, r) => a + r.poin, 0);
    const perTingkat = { Ringan: 0, Sedang: 0, Berat: 0 } as Record<string, number>;
    rows.forEach((r) => { if (perTingkat[r.tingkat] !== undefined) perTingkat[r.tingkat]++; });

    gambarRingkasan(doc, y, [
      { label: 'Total Kasus', nilai: String(totalKasus) },
      { label: 'Total Poin', nilai: String(totalPoin) },
      { label: 'Ringan / Sedang / Berat', nilai: `${perTingkat.Ringan} / ${perTingkat.Sedang} / ${perTingkat.Berat}` }
    ]);

    tambahFooterSemuaHalaman(doc);
    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laporan-pelanggaran-${bulan || tanggal || 'semua'}.pdf"`
    }
  });
}
