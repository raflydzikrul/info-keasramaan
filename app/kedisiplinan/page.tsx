'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, PageHeader, Button, Select, Badge, EmptyState } from '@/components/ui';
import { tanggalLokalHariIni, bulanLokalIni, tanggalAwalBulanLokal } from '@/lib/tanggal';
import { apiGet, apiSend, pesanError } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/use-refetch-on-focus';

type Kelas = { id: number; nama: string };
type Pelanggaran = {
  id: number; tanggal: string; nama_siswa: string; nis: string | null; nama_kelas: string | null;
  nama_kategori: string; tingkat: string; poin: number; keterangan: string | null; petugas: string | null;
};
type RekapRow = {
  siswa_id: number; nama: string; nis: string | null; nama_kelas: string | null;
  jumlah_kasus: number; ringan: number; sedang: number; berat: number; total_poin: number;
};
type RekapData = {
  rows: RekapRow[];
  ringkasan: { jumlah_santri: number; total_kasus: number; total_poin: number };
};

type Mode = 'bulan' | 'harian' | 'rentang';
const LABEL_MODE: Record<Mode, string> = { bulan: 'Bulanan', harian: 'Harian', rentang: 'Rentang Tanggal' };

export default function KedisiplinanPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [tampilan, setTampilan] = useState<'daftar' | 'rekap'>('daftar');
  const [tingkat, setTingkat] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [modePeriode, setModePeriode] = useState<Mode>('bulan');
  const [bulan, setBulan] = useState(bulanLokalIni);
  const [tanggal, setTanggal] = useState(tanggalLokalHariIni);
  const [dari, setDari] = useState(tanggalAwalBulanLokal);
  const [sampai, setSampai] = useState(tanggalLokalHariIni);

  const [list, setList] = useState<Pelanggaran[]>([]);
  const [rekap, setRekap] = useState<RekapData>({ rows: [], ringkasan: { jumlah_santri: 0, total_kasus: 0, total_poin: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  useEffect(() => {
    apiGet<Kelas[]>('/api/kelas').then(setKelasList).catch(() => {});
  }, []);

  const rentangTidakValid = modePeriode === 'rentang' && (!dari || !sampai || dari > sampai);

  // Parameter filter yang sama dipakai untuk daftar, rekap, dan unduhan PDF
  const buatParams = () => {
    const params = new URLSearchParams();
    if (tingkat) params.set('tingkat', tingkat);
    if (kelasId) params.set('kelas_id', kelasId);
    if (modePeriode === 'harian') params.set('tanggal', tanggal);
    else if (modePeriode === 'rentang') { params.set('dari', dari); params.set('sampai', sampai); }
    else params.set('bulan', bulan);
    return params;
  };

  const labelPeriodeAktif =
    modePeriode === 'harian' ? `tanggal ${tanggal}`
    : modePeriode === 'rentang' ? `${dari} s.d. ${sampai}`
    : `bulan ${bulan}`;

  const load = () => {
    const idPermintaanIni = ++requestIdRef.current;
    if (rentangTidakValid) {
      setLoading(false);
      setList([]);
      setRekap({ rows: [], ringkasan: { jumlah_santri: 0, total_kasus: 0, total_poin: 0 } });
      setError(!dari || !sampai
        ? 'Isi tanggal awal dan tanggal akhir terlebih dahulu.'
        : 'Tanggal awal tidak boleh lebih besar dari tanggal akhir.');
      return;
    }
    setLoading(true);
    setError('');
    const params = buatParams();

    const permintaan = tampilan === 'rekap'
      ? apiGet<RekapData>(`/api/pelanggaran/rekap?${params}`).then((d) => { if (idPermintaanIni === requestIdRef.current) setRekap(d); })
      : apiGet<Pelanggaran[]>(`/api/pelanggaran?${params}`).then((d) => { if (idPermintaanIni === requestIdRef.current) setList(d); });

    permintaan
      .catch((e) => {
        if (idPermintaanIni !== requestIdRef.current) return;
        setError(pesanError(e));
        setList([]);
        setRekap({ rows: [], ringkasan: { jumlah_santri: 0, total_kasus: 0, total_poin: 0 } });
      })
      .finally(() => {
        if (idPermintaanIni === requestIdRef.current) setLoading(false);
      });
  };
  useEffect(() => { load(); }, [tampilan, tingkat, kelasId, modePeriode, bulan, tanggal, dari, sampai]);
  useRefetchOnFocus(load);

  const adaData = tampilan === 'rekap' ? rekap.rows.length > 0 : list.length > 0;

  const downloadLaporan = () => {
    const params = buatParams();
    if (tampilan === 'rekap') params.set('mode', 'rekap');
    window.location.href = `/api/pelanggaran/laporan/pdf?${params}`;
  };

  const remove = async (id: number) => {
    if (!confirm('Hapus catatan pelanggaran ini?')) return;
    setError('');
    try {
      await apiSend(`/api/pelanggaran/${id}`, 'DELETE');
      load();
    } catch (e) {
      setError(pesanError(e));
    }
  };

  const counts = {
    Ringan: list.filter((p) => p.tingkat === 'Ringan').length,
    Sedang: list.filter((p) => p.tingkat === 'Sedang').length,
    Berat: list.filter((p) => p.tingkat === 'Berat').length
  };
  const poinTertinggi = Math.max(1, ...rekap.rows.map((r) => r.total_poin));

  return (
    <div>
      <PageHeader
        title="Daftar Pelanggaran"
        description="Daftar kasus dan rekap total poin pelanggaran santri"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadLaporan} disabled={!adaData || loading}>
              {tampilan === 'rekap' ? 'Download Rekap Poin' : 'Download Laporan'}
            </Button>
            <Link href="/kedisiplinan/input"><Button>+ Input Pelanggaran</Button></Link>
          </div>
        }
      />

      <div className="flex gap-1 mb-4 bg-sand-100 p-1 rounded-lg w-fit">
        {([['daftar', 'Daftar Kasus'], ['rekap', 'Rekap Poin per Santri']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTampilan(k)}
            className={`focus-ring px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tampilan === k ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-900/60 hover:text-emerald-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-emerald-900/50 mb-2">Menampilkan data {labelPeriodeAktif}</p>

      {tampilan === 'daftar' ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card className="p-4 border-l-4 !border-l-emerald-600">
            <p className="text-xs text-emerald-900/50">Ringan</p>
            <p className="font-display text-2xl text-emerald-900">{counts.Ringan}</p>
          </Card>
          <Card className="p-4 border-l-4 !border-l-gold-500">
            <p className="text-xs text-emerald-900/50">Sedang</p>
            <p className="font-display text-2xl text-gold-600">{counts.Sedang}</p>
          </Card>
          <Card className="p-4 border-l-4 !border-l-red-500">
            <p className="text-xs text-emerald-900/50">Berat</p>
            <p className="font-display text-2xl text-red-600">{counts.Berat}</p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card className="p-4">
            <p className="text-xs text-emerald-900/50">Santri Melanggar</p>
            <p className="font-display text-2xl text-emerald-900">{rekap.ringkasan.jumlah_santri}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-emerald-900/50">Total Kasus</p>
            <p className="font-display text-2xl text-emerald-900">{rekap.ringkasan.total_kasus}</p>
          </Card>
          <Card className="p-4 border-l-4 !border-l-gold-500">
            <p className="text-xs text-emerald-900/50">Total Poin</p>
            <p className="font-display text-2xl text-gold-600">{rekap.ringkasan.total_poin}</p>
          </Card>
        </div>
      )}

      <Card className="p-4 mb-5 space-y-3">
        <div className="flex gap-1 bg-sand-100 p-1 rounded-lg w-fit flex-wrap">
          {(['bulan', 'harian', 'rentang'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModePeriode(m)}
              className={`focus-ring px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                modePeriode === m ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-900/60 hover:text-emerald-900'
              }`}
            >
              {LABEL_MODE[m]}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <Select value={tingkat} onChange={(e) => setTingkat(e.target.value)} className="sm:max-w-[160px]">
            <option value="">Semua tingkat</option>
            <option value="Ringan">Ringan</option>
            <option value="Sedang">Sedang</option>
            <option value="Berat">Berat</option>
          </Select>
          <Select value={kelasId} onChange={(e) => setKelasId(e.target.value)} className="sm:max-w-[200px]">
            <option value="">Semua kelas</option>
            {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Select>

          {modePeriode === 'bulan' && (
            <input
              type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
              className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm sm:max-w-[180px]"
            />
          )}
          {modePeriode === 'harian' && (
            <input
              type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm sm:max-w-[180px]"
            />
          )}
          {modePeriode === 'rentang' && (
            <>
              <div>
                <label className="text-[11px] font-medium text-emerald-900/50 mb-1 block">Dari tanggal</label>
                <input
                  type="date" value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)}
                  className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm w-full sm:w-[170px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-emerald-900/50 mb-1 block">Sampai tanggal</label>
                <input
                  type="date" value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)}
                  className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm w-full sm:w-[170px]"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="py-14 text-center text-sm text-emerald-900/50">
            {tampilan === 'rekap' ? 'Menghitung rekap poin...' : 'Memuat data pelanggaran...'}
          </div>
        ) : error ? (
          <div className="py-14 text-center px-4">
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 inline-block">{error}</p>
            {!rentangTidakValid && (
              <div className="mt-3">
                <Button variant="secondary" onClick={load}>Coba Lagi</Button>
              </div>
            )}
          </div>
        ) : tampilan === 'rekap' ? (
          rekap.rows.length === 0 ? (
            <EmptyState title="Tidak ada pelanggaran" description="Tidak ada santri yang melanggar pada periode & filter yang dipilih." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                  <th className="px-5 py-3 w-10">#</th>
                  <th className="px-5 py-3">Santri</th>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-3 py-3 text-center">Kasus</th>
                  <th className="px-3 py-3 text-center">Ringan</th>
                  <th className="px-3 py-3 text-center">Sedang</th>
                  <th className="px-3 py-3 text-center">Berat</th>
                  <th className="px-5 py-3 min-w-[170px]">Total Poin</th>
                </tr>
              </thead>
              <tbody>
                {rekap.rows.map((r, i) => (
                  <tr key={r.siswa_id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                    <td className="px-5 py-3 text-emerald-900/50">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-emerald-950">{r.nama}</p>
                      {r.nis && <p className="text-xs text-emerald-900/40">NIS {r.nis}</p>}
                    </td>
                    <td className="px-5 py-3 text-emerald-900/70">{r.nama_kelas || '-'}</td>
                    <td className="px-3 py-3 text-center text-emerald-900/80">{r.jumlah_kasus}</td>
                    <td className="px-3 py-3 text-center text-emerald-800">{r.ringan}</td>
                    <td className="px-3 py-3 text-center text-gold-600">{r.sedang}</td>
                    <td className="px-3 py-3 text-center text-red-600">{r.berat}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-base text-emerald-950 w-12 text-right">{r.total_poin}</span>
                        <div className="flex-1 h-2 rounded-full bg-sand-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gold-500" style={{ width: `${(r.total_poin / poinTertinggi) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : list.length === 0 ? (
          <EmptyState title="Tidak ada pelanggaran" description="Tidak ditemukan catatan sesuai filter yang dipilih." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Santri</th>
                <th className="px-5 py-3">Kelas</th>
                <th className="px-5 py-3">Pelanggaran</th>
                <th className="px-5 py-3">Tingkat</th>
                <th className="px-5 py-3">Poin</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                  <td className="px-5 py-3 text-emerald-900/70 whitespace-nowrap">{p.tanggal}</td>
                  <td className="px-5 py-3 font-medium text-emerald-950">{p.nama_siswa}</td>
                  <td className="px-5 py-3 text-emerald-900/70">{p.nama_kelas || '-'}</td>
                  <td className="px-5 py-3 text-emerald-900/70">{p.nama_kategori}</td>
                  <td className="px-5 py-3"><Badge tingkat={p.tingkat} /></td>
                  <td className="px-5 py-3 font-medium text-emerald-900/80">{p.poin} pt</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Link href={`/kedisiplinan/input?id=${p.id}`} className="focus-ring text-emerald-900 hover:text-gold-600 text-xs font-medium">Edit</Link>
                    <button onClick={() => remove(p.id)} className="focus-ring text-red-600 hover:text-red-700 text-xs font-medium">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
