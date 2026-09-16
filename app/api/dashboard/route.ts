import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { tanggalServerHariIni, awalBulanBerikutnya } from '@/lib/tanggal';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = tanggalServerHariIni();
    const bulanIni = today.slice(0, 7);

    // Semua query independen dijalankan PARALEL (bersamaan), bukan satu-satu
    // menunggu selesai baru lanjut — ini yang paling mempercepat response.
    const [
      totalSiswaRes,
      totalKelasRes,
      absensiTodayRes,
      pelanggaranBulanRes,
      terbaruRowsRes
    ] = await Promise.all([
      supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('status', 'Aktif'),
      supabase.from('kelas').select('*', { count: 'exact', head: true }),
      // Filter langsung lewat join, tanpa perlu query terpisah untuk cari id jenis absensi wajib dulu
      supabase
        .from('absensi')
        .select('status, jenis_absensi!inner(kategori)')
        .eq('tanggal', today)
        .eq('jenis_absensi.kategori', 'Wajib'),
      // Satu query ini dipakai untuk 2 keperluan sekaligus (rekap per tingkat & per santri),
      // sebelumnya ini 2 query terpisah yang isinya tumpang tindih
      supabase
        .from('pelanggaran')
        .select('siswa_id, poin, siswa(nama, kelas(nama)), kategori_pelanggaran(tingkat)')
        .gte('tanggal', `${bulanIni}-01`).lt('tanggal', awalBulanBerikutnya(bulanIni)),
      supabase
        .from('pelanggaran')
        .select('tanggal, poin, siswa(nama), kategori_pelanggaran(nama, tingkat)')
        .order('created_at', { ascending: false })
        .limit(6)
    ]);

    // Cek satu-satu, supaya kalau ada yang gagal, pesan errornya jelas
    // menyebutkan query mana yang bermasalah — bukan error generik.
    const cekError: [string, any][] = [
      ['total siswa', totalSiswaRes.error],
      ['total kelas', totalKelasRes.error],
      ['absensi hari ini', absensiTodayRes.error],
      ['pelanggaran bulan ini', pelanggaranBulanRes.error],
      ['pelanggaran terbaru', terbaruRowsRes.error]
    ];
    for (const [label, err] of cekError) {
      if (err) {
        return NextResponse.json(
          { error: `Gagal memuat data ${label}: ${err.message}` },
          { status: 500 }
        );
      }
    }

    const totalSiswa = totalSiswaRes.count;
    const totalKelas = totalKelasRes.count;
    const absensiToday = absensiTodayRes.data;
    const pelanggaranBulan = pelanggaranBulanRes.data;
    const terbaruRows = terbaruRowsRes.data;

    // Absensi wajib hari ini
    const absensiHariIni = { hadir: 0, terlambat: 0, tidak_hadir: 0, total: 0 };
    (absensiToday || []).forEach((a: any) => {
      absensiHariIni.total++;
      if (a.status === 'Hadir') absensiHariIni.hadir++;
      else if (a.status === 'Terlambat') absensiHariIni.terlambat++;
      else absensiHariIni.tidak_hadir++;
    });

    // Pelanggaran bulan ini per tingkat + per santri, dari satu hasil query yang sama
    const tingkatCount = new Map<string, number>();
    const perSiswa = new Map<number, { nama: string; kelas: string | null; total_poin: number; jumlah_kasus: number }>();
    (pelanggaranBulan || []).forEach((p: any) => {
      const t = p.kategori_pelanggaran?.tingkat;
      if (t) tingkatCount.set(t, (tingkatCount.get(t) || 0) + 1);

      const existing = perSiswa.get(p.siswa_id);
      if (existing) { existing.total_poin += p.poin; existing.jumlah_kasus++; }
      else perSiswa.set(p.siswa_id, { nama: p.siswa?.nama, kelas: p.siswa?.kelas?.nama || null, total_poin: p.poin, jumlah_kasus: 1 });
    });

    const pelanggaranBulanIni = Array.from(tingkatCount.entries()).map(([tingkat, jumlah]) => ({ tingkat, jumlah }));
    const siswaPelanggaranTerbanyak = Array.from(perSiswa.values())
      .sort((a, b) => b.total_poin - a.total_poin)
      .slice(0, 5);

    const pelanggaranTerbaru = (terbaruRows || []).map((p: any) => ({
      tanggal: p.tanggal, nama_siswa: p.siswa?.nama,
      nama_kategori: p.kategori_pelanggaran?.nama, tingkat: p.kategori_pelanggaran?.tingkat, poin: p.poin
    }));

    return NextResponse.json({
      totalSiswa: totalSiswa || 0,
      totalKelas: totalKelas || 0,
      absensiHariIni,
      pelanggaranBulanIni,
      siswaPelanggaranTerbanyak,
      pelanggaranTerbaru
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Terjadi kesalahan tak terduga saat memuat dashboard' },
      { status: 500 }
    );
  }
}
