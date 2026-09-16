'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, PageHeader, Button, Select, Badge, EmptyState } from '@/components/ui';
import { tanggalLokalHariIni, bulanLokalIni } from '@/lib/tanggal';
import { apiGet, apiSend, pesanError } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/use-refetch-on-focus';

type Kelas = { id: number; nama: string };
type Pelanggaran = {
  id: number; tanggal: string; nama_siswa: string; nis: string | null; nama_kelas: string | null;
  nama_kategori: string; tingkat: string; poin: number; keterangan: string | null; petugas: string | null;
};

export default function KedisiplinanPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [tingkat, setTingkat] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [modePeriode, setModePeriode] = useState<'bulan' | 'harian'>('bulan');
  const [bulan, setBulan] = useState(bulanLokalIni);
  const [tanggal, setTanggal] = useState(tanggalLokalHariIni);
  const [list, setList] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  useEffect(() => {
    apiGet<Kelas[]>('/api/kelas').then(setKelasList).catch(() => {});
  }, []);

  const load = () => {
    const idPermintaanIni = ++requestIdRef.current;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (tingkat) params.set('tingkat', tingkat);
    if (kelasId) params.set('kelas_id', kelasId);
    if (modePeriode === 'harian') {
      params.set('tanggal', tanggal);
    } else {
      params.set('bulan', bulan);
    }
    apiGet<Pelanggaran[]>(`/api/pelanggaran?${params}`)
      .then((d) => {
        if (idPermintaanIni !== requestIdRef.current) return; // abaikan response yang sudah usang
        setList(d);
      })
      .catch((e) => {
        if (idPermintaanIni !== requestIdRef.current) return;
        setError(pesanError(e));
        setList([]);
      })
      .finally(() => {
        if (idPermintaanIni === requestIdRef.current) setLoading(false);
      });
  };
  useEffect(() => { load(); }, [tingkat, kelasId, modePeriode, bulan, tanggal]);
  useRefetchOnFocus(load);

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

  return (
    <div>
      <PageHeader
        title="Daftar Pelanggaran"
        description="Dashboard rekap pelanggaran santri dari kategori ringan hingga berat"
        action={<Link href="/kedisiplinan/input"><Button>+ Input Pelanggaran</Button></Link>}
      />

      <p className="text-xs text-emerald-900/50 mb-2">
        Menampilkan data {modePeriode === 'harian' ? `tanggal ${tanggal}` : `bulan ${bulan}`}
      </p>
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

      <Card className="p-4 mb-5 space-y-3">
        <div className="flex gap-1 bg-sand-100 p-1 rounded-lg w-fit">
          {(['bulan', 'harian'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModePeriode(m)}
              className={`focus-ring px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                modePeriode === m ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-900/60 hover:text-emerald-900'
              }`}
            >
              {m === 'bulan' ? 'Bulanan' : 'Harian'}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
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
          {modePeriode === 'bulan' ? (
            <input
              type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
              className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm sm:max-w-[180px]"
            />
          ) : (
            <input
              type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm sm:max-w-[180px]"
            />
          )}
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="py-14 text-center text-sm text-emerald-900/50">Memuat data pelanggaran...</div>
        ) : error ? (
          <div className="py-14 text-center px-4">
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 inline-block">{error}</p>
            <div className="mt-3">
              <Button variant="secondary" onClick={load}>Coba Lagi</Button>
            </div>
          </div>
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
                  <td className="px-5 py-3 text-right">
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
