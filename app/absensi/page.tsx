'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, PageHeader, Button, Select, EmptyState } from '@/components/ui';

type Kelas = { id: number; nama: string };
type Jenis = { id: number; nama: string; kategori: 'Wajib' | 'Sunnah' | 'Kegiatan' };
type SiswaRow = { id: number; nis: string | null; nama: string };
type Existing = { siswa_id: number; jenis_id: number; status: string; keterangan: string | null };

const STATUS_OPTIONS = ['Hadir', 'Terlambat', 'Alpa', 'Izin', 'Sakit'] as const;
const STATUS_COLOR: Record<string, string> = {
  Hadir: 'bg-emerald-700 text-white',
  Terlambat: 'bg-orange-500 text-white',
  Alpa: 'bg-red-500 text-white',
  Izin: 'bg-gold-500 text-white',
  Sakit: 'bg-emerald-900/30 text-emerald-900'
};

export default function AbsensiPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [kategoriTab, setKategoriTab] = useState<'Wajib' | 'Sunnah' | 'Kegiatan'>('Wajib');

  const [siswa, setSiswa] = useState<SiswaRow[]>([]);
  const [jenis, setJenis] = useState<Jenis[]>([]);
  const [grid, setGrid] = useState<Record<string, string>>({}); // key: siswaId-jenisId => status
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => { fetch('/api/kelas').then((r) => r.json()).then((d) => { setKelasList(d); if (d[0]) setKelasId(String(d[0].id)); }); }, []);

  const loadGrid = () => {
    if (!kelasId || !tanggal) return;
    fetch(`/api/absensi?kelas_id=${kelasId}&tanggal=${tanggal}`).then((r) => r.json()).then((d) => {
      setSiswa(d.siswa); setJenis(d.jenis);
      const g: Record<string, string> = {};
      d.existing.forEach((e: Existing) => { g[`${e.siswa_id}-${e.jenis_id}`] = e.status; });
      setGrid(g);
    });
  };

  useEffect(() => { loadGrid(); }, [kelasId, tanggal]);

  const jenisTampil = useMemo(() => jenis.filter((j) => j.kategori === kategoriTab), [jenis, kategoriTab]);

  const setStatus = (siswaId: number, jenisId: number, status: string) => {
    setGrid((prev) => ({ ...prev, [`${siswaId}-${jenisId}`]: status }));
  };

  const tandaiSemuaHadir = () => {
    const g = { ...grid };
    siswa.forEach((s) => jenisTampil.forEach((j) => { g[`${s.id}-${j.id}`] = 'Hadir'; }));
    setGrid(g);
  };

  const simpan = async () => {
    setSaving(true); setSavedMsg('');
    const entries = siswa.flatMap((s) =>
      jenisTampil.map((j) => ({ siswa_id: s.id, jenis_id: j.id, status: grid[`${s.id}-${j.id}`] || 'Alpa' }))
    );
    await fetch('/api/absensi', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal, entries })
    });
    setSaving(false);
    setSavedMsg(`Tersimpan · ${entries.length} catatan absensi ${kategoriTab.toLowerCase()}`);
  };

  return (
    <div>
      <PageHeader
        title="Absensi Sholat & Kegiatan"
        description="Catat kehadiran sholat wajib, sholat sunnah, dan kegiatan per kelas setiap hari"
      />

      <Card className="p-4 mb-5 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kelas</label>
          <Select value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
            {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Tanggal</label>
          <input
            type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
            className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm"
          />
        </div>
        <Button variant="secondary" onClick={tandaiSemuaHadir}>Tandai semua Hadir</Button>
        <Button onClick={simpan} disabled={saving || siswa.length === 0}>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</Button>
      </Card>

      {savedMsg && (
        <div className="mb-4 text-sm text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-4 py-2.5">{savedMsg}</div>
      )}

      <div className="flex gap-1 mb-4 bg-sand-100 p-1 rounded-lg w-fit">
        {(['Wajib', 'Sunnah', 'Kegiatan'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setKategoriTab(t)}
            className={`focus-ring px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              kategoriTab === t ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-900/60 hover:text-emerald-900'
            }`}
          >
            {t === 'Wajib' ? 'Sholat Wajib' : t === 'Sunnah' ? 'Sholat Sunnah' : 'Kegiatan Lain'}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto">
        {siswa.length === 0 ? (
          <EmptyState title="Belum ada santri di kelas ini" description="Tambahkan santri terlebih dahulu di menu Data Santri." />
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                <th className="px-5 py-3 sticky left-0 bg-white">Nama Santri</th>
                {jenisTampil.map((j) => (
                  <th key={j.id} className="px-3 py-3 text-center whitespace-nowrap">{j.nama}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => (
                <tr key={s.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                  <td className="px-5 py-2.5 font-medium text-emerald-950 sticky left-0 bg-white whitespace-nowrap">{s.nama}</td>
                  {jenisTampil.map((j) => {
                    const key = `${s.id}-${j.id}`;
                    const current = grid[key] || '';
                    return (
                      <td key={j.id} className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          {STATUS_OPTIONS.map((st) => (
                            <button
                              key={st}
                              title={st}
                              onClick={() => setStatus(s.id, j.id, st)}
                              className={`focus-ring w-6 h-6 rounded-md text-[10px] font-bold border transition-colors ${
                                current === st ? STATUS_COLOR[st] + ' border-transparent' : 'bg-white border-sand-200 text-emerald-900/30 hover:border-emerald-300'
                              }`}
                            >
                              {st[0]}
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-emerald-900/40 mt-3">
        H = Hadir · T = Terlambat · A = Alpa · I = Izin · S = Sakit. Klik tombol untuk menandai status, lalu tekan "Simpan Absensi". Santri yang belum ditandai otomatis tersimpan sebagai Alpa.
      </p>
    </div>
  );
}
