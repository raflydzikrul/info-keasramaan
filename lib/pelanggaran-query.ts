import supabase from '@/lib/supabase';
import { awalBulanBerikutnya } from '@/lib/tanggal';

// Filter bersama untuk daftar pelanggaran, rekap poin, dan laporan PDF.
// Prioritas periode: tanggal (harian) > dari/sampai (rentang) > bulan.

export type FilterPelanggaran = {
  tingkat?: string | null;
  kelasId?: string | null;
  bulan?: string | null; // YYYY-MM
  tanggal?: string | null; // YYYY-MM-DD
  dari?: string | null; // YYYY-MM-DD
  sampai?: string | null; // YYYY-MM-DD
};

export type RekapPoinRow = {
  siswa_id: number;
  nama: string;
  nis: string | null;
  nama_kelas: string | null;
  jumlah_kasus: number;
  ringan: number;
  sedang: number;
  berat: number;
  total_poin: number;
};

export function bacaFilter(sp: URLSearchParams): FilterPelanggaran {
  const ambil = (k: string) => {
    const v = sp.get(k);
    return v && v.trim() ? v.trim() : null;
  };
  return {
    tingkat: ambil('tingkat'),
    kelasId: ambil('kelas_id'),
    bulan: ambil('bulan'),
    tanggal: ambil('tanggal'),
    dari: ambil('dari'),
    sampai: ambil('sampai')
  };
}

function tanggalValid(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Cek balik: menolak tanggal yang tidak pernah ada, misalnya 2026-09-31
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function bulanValid(s: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(s)) return false;
  const m = Number(s.slice(5));
  return m >= 1 && m <= 12;
}

/** Mengembalikan pesan error kalau filter tidak valid, atau null kalau aman. */
export function validasiFilter(f: FilterPelanggaran): string | null {
  if (f.tingkat && !['Ringan', 'Sedang', 'Berat'].includes(f.tingkat)) {
    return `Tingkat "${f.tingkat}" tidak dikenali`;
  }
  if (f.tanggal && !tanggalValid(f.tanggal)) return `Tanggal "${f.tanggal}" tidak valid`;
  if (f.dari && !tanggalValid(f.dari)) return `Tanggal awal "${f.dari}" tidak valid`;
  if (f.sampai && !tanggalValid(f.sampai)) return `Tanggal akhir "${f.sampai}" tidak valid`;
  if (f.bulan && !bulanValid(f.bulan)) return `Bulan "${f.bulan}" tidak valid`;
  if (f.dari && f.sampai && f.dari > f.sampai) {
    return 'Tanggal awal tidak boleh lebih besar dari tanggal akhir';
  }
  return null;
}

/** Menerapkan filter ke query pelanggaran (harus memakai join siswa!inner & kategori_pelanggaran!inner). */
export function terapkanFilter(query: any, f: FilterPelanggaran): any {
  if (f.kelasId) query = query.eq('siswa.kelas_id', f.kelasId);
  if (f.tingkat) query = query.eq('kategori_pelanggaran.tingkat', f.tingkat);

  if (f.tanggal) {
    query = query.eq('tanggal', f.tanggal);
  } else if (f.dari || f.sampai) {
    if (f.dari) query = query.gte('tanggal', f.dari);
    if (f.sampai) query = query.lte('tanggal', f.sampai);
  } else if (f.bulan) {
    query = query.gte('tanggal', `${f.bulan}-01`).lt('tanggal', awalBulanBerikutnya(f.bulan));
  }
  return query;
}

export function labelPeriode(f: FilterPelanggaran): string {
  if (f.tanggal) return `Tanggal ${f.tanggal}`;
  if (f.dari && f.sampai) return `${f.dari} s.d. ${f.sampai}`;
  if (f.dari) return `Mulai ${f.dari}`;
  if (f.sampai) return `Sampai ${f.sampai}`;
  if (f.bulan) return `Bulan ${f.bulan}`;
  return 'Seluruh Periode';
}

/**
 * Supabase membatasi hasil 1000 baris per permintaan. Fungsi ini mengambil
 * semua halaman, supaya perhitungan poin tidak terpotong diam-diam kalau
 * catatan pelanggarannya lebih dari 1000.
 * `buatQuery` dipanggil ulang tiap halaman. Urutan HARUS deterministik.
 */
export async function ambilSemua(buatQuery: () => any): Promise<{ data: any[] | null; error: any }> {
  const UKURAN = 1000;
  const hasil: any[] = [];
  for (let mulai = 0; ; mulai += UKURAN) {
    const { data, error } = await buatQuery().range(mulai, mulai + UKURAN - 1);
    if (error) return { data: null, error };
    hasil.push(...(data || []));
    if (!data || data.length < UKURAN) break;
  }
  return { data: hasil, error: null };
}

/** Menghitung total poin & jumlah kasus per santri sesuai filter. Diurutkan dari poin terbesar. */
export async function ambilRekapPoin(f: FilterPelanggaran): Promise<RekapPoinRow[]> {
  const { data, error } = await ambilSemua(() =>
    terapkanFilter(
      supabase
        .from('pelanggaran')
        .select('id, siswa_id, poin, siswa!inner(nama, nis, kelas_id, kelas(nama)), kategori_pelanggaran!inner(tingkat)')
        .order('id', { ascending: true }),
      f
    )
  );
  if (error) throw new Error(error.message);

  const peta = new Map<number, RekapPoinRow>();
  (data || []).forEach((p: any) => {
    let r = peta.get(p.siswa_id);
    if (!r) {
      r = {
        siswa_id: p.siswa_id,
        nama: p.siswa?.nama || '-',
        nis: p.siswa?.nis || null,
        nama_kelas: p.siswa?.kelas?.nama || null,
        jumlah_kasus: 0, ringan: 0, sedang: 0, berat: 0, total_poin: 0
      };
      peta.set(p.siswa_id, r);
    }
    r.jumlah_kasus++;
    r.total_poin += Number(p.poin) || 0;
    const t = p.kategori_pelanggaran?.tingkat;
    if (t === 'Ringan') r.ringan++;
    else if (t === 'Sedang') r.sedang++;
    else if (t === 'Berat') r.berat++;
  });

  return Array.from(peta.values()).sort(
    (a, b) => b.total_poin - a.total_poin || a.nama.localeCompare(b.nama)
  );
}
