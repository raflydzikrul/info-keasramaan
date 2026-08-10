'use client';

import { useEffect, useState } from 'react';
import { Card, PageHeader, Button, Select, EmptyState } from '@/components/ui';

type Kelas = { id: number; nama: string };
type RekapRow = { id: number; nis: string | null; nama: string; hadir: number; terlambat: number; alpa: number; izin: number; sakit: number; total: number; persen: number };

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function RekapAbsensiPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState('');
  const [kategori, setKategori] = useState('Wajib');
  const [dari, setDari] = useState(firstDayOfMonth());
  const [sampai, setSampai] = useState(today());

  const [namaKelas, setNamaKelas] = useState('');
  const [data, setData] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/kelas').then((r) => r.json()).then((d) => { setKelasList(d); if (d[0]) setKelasId(String(d[0].id)); });
  }, []);

  const muatRekap = () => {
    if (!kelasId) return;
    setLoading(true);
    const params = new URLSearchParams({ kelas_id: kelasId, kategori, dari, sampai });
    fetch(`/api/absensi/rekap?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data || []); setNamaKelas(d.kelas || ''); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { muatRekap(); }, [kelasId, kategori, dari, sampai]);

  const downloadPdf = () => {
    const params = new URLSearchParams({ kelas_id: kelasId, kategori, dari, sampai });
    window.location.href = `/api/absensi/rekap/pdf?${params}`;
  };

  const rataPersen = data.length > 0
    ? Math.round(data.reduce((a, r) => a + r.persen, 0) / data.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="Rekap Absensi"
        description="Rekap kehadiran santri per kelas dalam rentang tanggal tertentu, siap diunduh dalam bentuk PDF"
        action={<Button onClick={downloadPdf} disabled={data.length === 0}>Download PDF</Button>}
      />

      <Card className="p-4 mb-5 grid sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kelas</label>
          <Select value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Jenis</label>
          <Select value={kategori} onChange={(e) => setKategori(e.target.value)}>
            <option value="Wajib">Sholat Wajib</option>
            <option value="Sunnah">Sholat Sunnah</option>
            <option value="Kegiatan">Kegiatan</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Dari Tanggal</label>
          <input type="date" value={dari} onChange={(e) => setDari(e.target.value)}
            className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Sampai Tanggal</label>
          <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)}
            className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm" />
        </div>
      </Card>

      {data.length > 0 && (
        <Card className="p-4 mb-5">
          <p className="text-sm text-emerald-900/60">
            Rata-rata kehadiran <span className="font-semibold text-emerald-950">{namaKelas}</span> periode {dari} s.d. {sampai}:{' '}
            <span className="font-display text-lg text-gold-600">{rataPersen}%</span>
          </p>
        </Card>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="py-14 text-center text-sm text-emerald-900/50">Memuat rekap...</div>
        ) : data.length === 0 ? (
          <EmptyState title="Tidak ada data" description="Belum ada catatan absensi pada rentang tanggal & kelas yang dipilih." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                <th className="px-5 py-3">NIS</th>
                <th className="px-5 py-3">Nama Santri</th>
                <th className="px-3 py-3 text-center">Hadir</th>
                <th className="px-3 py-3 text-center">Terlambat</th>
                <th className="px-3 py-3 text-center">Alpa</th>
                <th className="px-3 py-3 text-center">Izin</th>
                <th className="px-3 py-3 text-center">Sakit</th>
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-5 py-3 text-right">% Hadir</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                  <td className="px-5 py-2.5 text-emerald-900/70">{r.nis || '-'}</td>
                  <td className="px-5 py-2.5 font-medium text-emerald-950">{r.nama}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-900/70">{r.hadir}</td>
                  <td className="px-3 py-2.5 text-center text-orange-600">{r.terlambat}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-900/70">{r.alpa}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-900/70">{r.izin}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-900/70">{r.sakit}</td>
                  <td className="px-3 py-2.5 text-center text-emerald-900/70">{r.total}</td>
                  <td className={`px-5 py-2.5 text-right font-medium ${r.persen < 75 ? 'text-red-600' : 'text-emerald-800'}`}>
                    {r.persen}%
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
