import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';
import {
  bacaFilter, validasiFilter, terapkanFilter, ambilSemua, ambilRekapPoin, labelPeriode
} from '@/lib/pelanggaran-query';
import { gambarKop, gambarTabel, gambarRingkasan, tambahFooterSemuaHalaman } from '@/lib/pdf-helpers';

export const dynamic = 'force-dynamic';

// GET /api/pelanggaran/laporan/pdf?tingkat=&kelas_id=&bulan= | &tanggal= | &dari=&sampai= [&mode=rekap]
// mode=rekap -> tabel total poin per santri. Tanpa mode -> daftar seluruh kasus.
export async function GET(req: Request) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const modeRekap = sp.get('mode') === 'rekap';
  const filter = bacaFilter(sp);
  const pesanFilter = validasiFilter(filter);
  if (pesanFilter) return NextResponse.json({ error: pesanFilter }, { status: 400 });

  // Nama kelas untuk judul laporan (kalau difilter per kelas)
  let namaKelas = 'Semua Kelas';
  if (filter.kelasId) {
    const { data: k } = await supabase.from('kelas').select('nama').eq('id', filter.kelasId).maybeSingle();
    namaKelas = k?.nama || 'Semua Kelas';
  }

  let rows: any[] = [];
  let rekapRows: Awaited<ReturnType<typeof ambilRekapPoin>> = [];

  try {
    if (modeRekap) {
      rekapRows = await ambilRekapPoin(filter);
    } else {
      const { data, error } = await ambilSemua(() =>
        terapkanFilter(
          supabase
            .from('pelanggaran')
            .select('id, tanggal, poin, keterangan, petugas, siswa!inner(nama, nis, kelas_id, kelas(nama)), kategori_pelanggaran!inner(nama, tingkat)')
            .order('tanggal', { ascending: false })
            .order('id', { ascending: false }),
          filter
        )
      );
      if (error) throw new Error(error.message);
      rows = (data || []).map((p: any) => ({
        tanggal: p.tanggal,
        nama_siswa: p.siswa?.nama,
        nama_kelas: p.siswa?.kelas?.nama || '-',
        nama_kategori: p.kategori_pelanggaran?.nama,
        tingkat: p.kategori_pelanggaran?.tingkat,
        poin: p.poin
      }));
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menyusun laporan' }, { status: 500 });
  }

  const infoKop = [
    { label: 'Kelas', nilai: namaKelas },
    { label: 'Tingkat', nilai: filter.tingkat || 'Semua Tingkat' },
    { label: 'Periode', nilai: labelPeriode(filter) }
  ];

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pdfBuffer: Buffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    if (modeRekap) {
      let y = gambarKop(doc, 'Rekap Poin Pelanggaran Santri', null, infoKop);
      y = gambarTabel(
        doc, y,
        [
          { label: 'No', lebar: 22, align: 'center' },
          { label: 'Nama Santri', lebar: 150 },
          { label: 'NIS', lebar: 65 },
          { label: 'Kelas', lebar: 78 },
          { label: 'Kasus', lebar: 42, align: 'center' },
          { label: 'R', lebar: 28, align: 'center' },
          { label: 'S', lebar: 28, align: 'center' },
          { label: 'B', lebar: 28, align: 'center' },
          { label: 'Total Poin', lebar: 74, align: 'right' }
        ],
        rekapRows.map((r, i) => [
          String(i + 1), r.nama, r.nis || '-', r.nama_kelas || '-',
          String(r.jumlah_kasus), String(r.ringan), String(r.sedang), String(r.berat), String(r.total_poin)
        ]),
        { pesanKosong: 'Tidak ada pelanggaran pada periode & filter ini.' }
      );

      gambarRingkasan(doc, y, [
        { label: 'Santri Melanggar', nilai: String(rekapRows.length) },
        { label: 'Total Kasus', nilai: String(rekapRows.reduce((a, r) => a + r.jumlah_kasus, 0)) },
        { label: 'Total Poin', nilai: String(rekapRows.reduce((a, r) => a + r.total_poin, 0)) }
      ]);
      doc.font('Helvetica').fontSize(7.5).fillColor('#6b7280')
        .text('R = Ringan, S = Sedang, B = Berat. Diurutkan dari total poin terbesar.', 40, doc.y + 8);
    } else {
      let y = gambarKop(doc, 'Laporan Pelanggaran Santri', null, infoKop);
      y = gambarTabel(
        doc, y,
        [
          { label: 'No', lebar: 22, align: 'center' },
          { label: 'Tanggal', lebar: 58 },
          { label: 'Nama Santri', lebar: 130 },
          { label: 'Kelas', lebar: 70 },
          { label: 'Kategori', lebar: 120 },
          { label: 'Tingkat', lebar: 60 },
          { label: 'Poin', lebar: 55, align: 'right' }
        ],
        rows.map((r, i) => [
          String(i + 1), r.tanggal, r.nama_siswa, r.nama_kelas, r.nama_kategori, r.tingkat, String(r.poin)
        ]),
        { pesanKosong: 'Tidak ada data pelanggaran pada periode & filter ini.' }
      );

      const perTingkat = { Ringan: 0, Sedang: 0, Berat: 0 } as Record<string, number>;
      rows.forEach((r) => { if (perTingkat[r.tingkat] !== undefined) perTingkat[r.tingkat]++; });

      gambarRingkasan(doc, y, [
        { label: 'Total Kasus', nilai: String(rows.length) },
        { label: 'Total Poin', nilai: String(rows.reduce((a, r) => a + r.poin, 0)) },
        { label: 'Ringan / Sedang / Berat', nilai: `${perTingkat.Ringan} / ${perTingkat.Sedang} / ${perTingkat.Berat}` }
      ]);
    }

    tambahFooterSemuaHalaman(doc);
    doc.end();
  });

  const namaPeriode = (filter.tanggal || (filter.dari && filter.sampai ? `${filter.dari}_${filter.sampai}` : filter.bulan) || 'semua');
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${modeRekap ? 'rekap-poin' : 'laporan'}-pelanggaran-${namaPeriode}.pdf"`
    }
  });
}
