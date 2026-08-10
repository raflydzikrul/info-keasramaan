'use client';

import { useEffect, useState } from 'react';
import { Card, PageHeader, Button, Select, Input, Textarea, Badge } from '@/components/ui';

type Kelas = { id: number; nama: string };
type Siswa = { id: number; nama: string; nis: string | null };
type Kategori = { id: number; nama: string; tingkat: string; poin: number };

export default function InputPelanggaranPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState('');
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [siswaId, setSiswaId] = useState('');
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [kategoriId, setKategoriId] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState('');
  const [petugas, setPetugas] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/kelas').then((r) => r.json()).then(setKelasList);
    fetch('/api/kategori-pelanggaran').then((r) => r.json()).then(setKategoriList);
  }, []);

  useEffect(() => {
    if (!kelasId) { setSiswaList([]); return; }
    fetch(`/api/siswa?kelas_id=${kelasId}`).then((r) => r.json()).then(setSiswaList);
  }, [kelasId]);

  const kategoriTerpilih = kategoriList.find((k) => String(k.id) === kategoriId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaId || !kategoriId) return;
    setSaving(true); setSuccess('');
    const res = await fetch('/api/pelanggaran', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siswa_id: siswaId, kategori_id: kategoriId, tanggal, keterangan, petugas })
    });
    setSaving(false);
    if (res.ok) {
      setSuccess('Pelanggaran berhasil dicatat.');
      setKategoriId(''); setKeterangan('');
    }
  };

  return (
    <div>
      <PageHeader title="Input Pelanggaran" description="Catat pelanggaran santri sesuai kategori dan tingkat keparahannya" />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kelas</label>
                <Select value={kelasId} onChange={(e) => { setKelasId(e.target.value); setSiswaId(''); }} required>
                  <option value="">— Pilih kelas —</option>
                  {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Santri</label>
                <Select value={siswaId} onChange={(e) => setSiswaId(e.target.value)} required disabled={!kelasId}>
                  <option value="">— Pilih santri —</option>
                  {siswaList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kategori Pelanggaran</label>
              <Select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} required>
                <option value="">— Pilih kategori —</option>
                {(['Ringan', 'Sedang', 'Berat'] as const).map((t) => (
                  <optgroup key={t} label={t}>
                    {kategoriList.filter((k) => k.tingkat === t).map((k) => (
                      <option key={k.id} value={k.id}>{k.nama} ({k.poin} poin)</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>

            {kategoriTerpilih && (
              <div className="flex items-center gap-2 text-sm bg-sand-50 border border-sand-200 rounded-lg px-4 py-2.5">
                <Badge tingkat={kategoriTerpilih.tingkat} />
                <span className="text-emerald-900/70">akan menambah</span>
                <span className="font-semibold text-emerald-950">{kategoriTerpilih.poin} poin</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Tanggal Kejadian</label>
                <input
                  type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required
                  className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Petugas / Pencatat</label>
                <Input value={petugas} onChange={(e) => setPetugas(e.target.value)} placeholder="Nama pengasuh/musyrif" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Keterangan (opsional)</label>
              <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={3} placeholder="Detail kejadian, lokasi, saksi, dll." />
            </div>

            {success && <div className="text-sm text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-4 py-2.5">{success}</div>}

            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pelanggaran'}</Button>
          </form>
        </Card>

        <Card className="p-5 h-fit">
          <p className="font-display text-lg mb-3">Panduan Poin</p>
          <ul className="text-sm space-y-2 text-emerald-900/70">
            <li className="flex justify-between"><span>Ringan</span><span>5–10 poin</span></li>
            <li className="flex justify-between"><span>Sedang</span><span>25–50 poin</span></li>
            <li className="flex justify-between"><span>Berat</span><span>75–100 poin</span></li>
          </ul>
          <p className="text-xs text-emerald-900/50 mt-4">
            Kelola daftar kategori di menu <span className="font-medium">Kategori Pelanggaran</span> jika perlu menambah jenis pelanggaran baru.
          </p>
        </Card>
      </div>
    </div>
  );
}
