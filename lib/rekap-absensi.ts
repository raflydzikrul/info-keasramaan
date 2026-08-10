import supabase from '@/lib/supabase';

export type RekapRow = {
  id: number; nis: string | null; nama: string;
  hadir: number; terlambat: number; alpa: number; izin: number; sakit: number; total: number; persen: number;
};

export async function ambilRekapAbsensi(kelasId: string, kategori: string, dari: string, sampai: string) {
  const { data: kelas } = await supabase.from('kelas').select('nama, wali_kelas').eq('id', kelasId).maybeSingle();

  const { data: siswaList, error: e1 } = await supabase
    .from('siswa')
    .select('id, nis, nama')
    .eq('kelas_id', kelasId)
    .eq('status', 'Aktif')
    .order('nama');
  if (e1) throw new Error(e1.message);

  const { data: jenisSesuaiKategori } = await supabase.from('jenis_absensi').select('id').eq('kategori', kategori);
  const jenisIds = (jenisSesuaiKategori || []).map((j: any) => j.id);

  const siswaIds = (siswaList || []).map((s: any) => s.id);
  let absensiRows: any[] = [];
  if (siswaIds.length > 0 && jenisIds.length > 0) {
    const { data } = await supabase
      .from('absensi')
      .select('siswa_id, status')
      .in('siswa_id', siswaIds)
      .in('jenis_id', jenisIds)
      .gte('tanggal', dari)
      .lte('tanggal', sampai);
    absensiRows = data || [];
  }

  const perSiswa = new Map<number, Omit<RekapRow, 'id' | 'nis' | 'nama' | 'persen'>>();
  (siswaList || []).forEach((s: any) => perSiswa.set(s.id, { hadir: 0, terlambat: 0, alpa: 0, izin: 0, sakit: 0, total: 0 }));
  absensiRows.forEach((a) => {
    const rec = perSiswa.get(a.siswa_id);
    if (!rec) return;
    rec.total++;
    if (a.status === 'Hadir') rec.hadir++;
    else if (a.status === 'Terlambat') rec.terlambat++;
    else if (a.status === 'Alpa') rec.alpa++;
    else if (a.status === 'Izin') rec.izin++;
    else if (a.status === 'Sakit') rec.sakit++;
  });

  const data: RekapRow[] = (siswaList || []).map((s: any) => {
    const rec = perSiswa.get(s.id)!;
    return { ...s, ...rec, persen: rec.total > 0 ? Math.round((rec.hadir / rec.total) * 100) : 0 };
  });

  return { kelasNama: kelas?.nama || '-', waliKelas: kelas?.wali_kelas || null, data };
}
