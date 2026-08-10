import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { count: totalSiswa } = await supabase
    .from('siswa').select('*', { count: 'exact', head: true }).eq('status', 'Aktif');
  const { count: totalKelas } = await supabase
    .from('kelas').select('*', { count: 'exact', head: true });

  const today = new Date().toISOString().slice(0, 10);
  const bulanIni = today.slice(0, 7);

  // Absensi wajib hari ini
  const { data: jenisWajib } = await supabase.from('jenis_absensi').select('id').eq('kategori', 'Wajib');
  const jenisWajibIds = (jenisWajib || []).map((j: any) => j.id);
  let absensiHariIni = { hadir: 0, terlambat: 0, tidak_hadir: 0, total: 0 };
  if (jenisWajibIds.length > 0) {
    const { data: absensiToday } = await supabase
      .from('absensi').select('status').eq('tanggal', today).in('jenis_id', jenisWajibIds);
    (absensiToday || []).forEach((a: any) => {
      absensiHariIni.total++;
      if (a.status === 'Hadir') absensiHariIni.hadir++;
      else if (a.status === 'Terlambat') absensiHariIni.terlambat++;
      else absensiHariIni.tidak_hadir++;
    });
  }

  // Pelanggaran bulan ini per tingkat
  const { data: pelanggaranBulanRows } = await supabase
    .from('pelanggaran')
    .select('poin, kategori_pelanggaran(tingkat)')
    .gte('tanggal', `${bulanIni}-01`).lte('tanggal', `${bulanIni}-31`);

  const tingkatCount = new Map<string, number>();
  (pelanggaranBulanRows || []).forEach((p: any) => {
    const t = p.kategori_pelanggaran?.tingkat;
    if (t) tingkatCount.set(t, (tingkatCount.get(t) || 0) + 1);
  });
  const pelanggaranBulanIni = Array.from(tingkatCount.entries()).map(([tingkat, jumlah]) => ({ tingkat, jumlah }));

  // Santri poin pelanggaran terbanyak bulan ini
  const { data: pelanggaranDetail } = await supabase
    .from('pelanggaran')
    .select('siswa_id, poin, siswa(nama, kelas(nama))')
    .gte('tanggal', `${bulanIni}-01`).lte('tanggal', `${bulanIni}-31`);

  const perSiswa = new Map<number, { nama: string; kelas: string | null; total_poin: number; jumlah_kasus: number }>();
  (pelanggaranDetail || []).forEach((p: any) => {
    const existing = perSiswa.get(p.siswa_id);
    if (existing) { existing.total_poin += p.poin; existing.jumlah_kasus++; }
    else perSiswa.set(p.siswa_id, { nama: p.siswa?.nama, kelas: p.siswa?.kelas?.nama || null, total_poin: p.poin, jumlah_kasus: 1 });
  });
  const siswaPelanggaranTerbanyak = Array.from(perSiswa.values())
    .sort((a, b) => b.total_poin - a.total_poin)
    .slice(0, 5);

  // Aktivitas pelanggaran terbaru
  const { data: terbaruRows } = await supabase
    .from('pelanggaran')
    .select('tanggal, poin, siswa(nama), kategori_pelanggaran(nama, tingkat)')
    .order('created_at', { ascending: false })
    .limit(6);

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
}
