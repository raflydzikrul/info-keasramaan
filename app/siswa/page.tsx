'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, PageHeader, Button, Input, Select, EmptyState } from '@/components/ui';

type Kelas = { id: number; nama: string };
type Siswa = { id: number; nis: string | null; nama: string; kelas_id: number | null; nama_kelas: string | null; jk: string; status: string; total_poin_pelanggaran: number };
type HasilImport = { total_baris: number; berhasil: number; gagal: { baris: number; alasan: string }[]; kelas_tidak_ditemukan: string[] };

export default function SiswaPage() {
  const [list, setList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [q, setQ] = useState('');

  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [jk, setJk] = useState('L');
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hasilImport, setHasilImport] = useState<HasilImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (filterKelas) params.set('kelas_id', filterKelas);
    if (q) params.set('q', q);
    fetch(`/api/siswa?${params}`).then((r) => r.json()).then(setList);
  };

  useEffect(() => { fetch('/api/kelas').then((r) => r.json()).then(setKelasList); }, []);
  useEffect(() => { load(); }, [filterKelas, q]);

  const resetForm = () => { setNis(''); setNama(''); setKelasId(''); setJk('L'); setEditId(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    setLoading(true);
    const payload = { nis, nama, kelas_id: kelasId || null, jk, status: 'Aktif' };
    const url = editId ? `/api/siswa/${editId}` : '/api/siswa';
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setLoading(false);
    resetForm();
    load();
  };

  const edit = (s: Siswa) => {
    setEditId(s.id); setNis(s.nis || ''); setNama(s.nama); setKelasId(s.kelas_id ? String(s.kelas_id) : ''); setJk(s.jk);
  };

  const remove = async (id: number) => {
    if (!confirm('Hapus data santri ini beserta riwayat absensi & pelanggarannya?')) return;
    await fetch(`/api/siswa/${id}`, { method: 'DELETE' });
    load();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setHasilImport(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/siswa/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal mengimpor file');
      } else {
        setHasilImport(data);
        load();
      }
    } catch {
      alert('Terjadi kesalahan saat mengunggah file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Data Santri"
        description="Kelola data induk santri, penempatan kelas, dan jenis kelamin"
        action={
          <Button variant="secondary" onClick={() => setShowImport(!showImport)}>
            {showImport ? 'Tutup Import' : 'Import dari Excel'}
          </Button>
        }
      />

      {showImport && (
        <Card className="p-5 mb-5">
          <p className="font-display text-lg mb-1">Import Data Santri dari Excel</p>
          <p className="text-sm text-emerald-900/60 mb-4">
            Kolom yang dibaca: <span className="font-medium">NIS, Nama, Kelas, JK</span>. Kolom "Kelas" harus sama persis dengan nama kelas yang sudah ada di menu Data Kelas — kalau belum cocok, santri tetap masuk tapi tanpa kelas dan bisa diedit manual nanti.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <a href="/api/siswa/import/template" className="focus-ring inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium bg-sand-100 text-emerald-900 border border-sand-200 hover:bg-sand-200">
              Download Template
            </a>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={importing}
              className="focus-ring text-sm file:mr-3 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:bg-emerald-900 file:text-white file:text-sm file:font-medium hover:file:bg-emerald-800 disabled:opacity-50"
            />
            {importing && <span className="text-sm text-emerald-900/60">Mengimpor...</span>}
          </div>

          {hasilImport && (
            <div className="mt-4 border-t border-sand-200 pt-4 text-sm space-y-2">
              <p>
                <span className="font-medium text-emerald-950">{hasilImport.berhasil}</span> dari{' '}
                <span className="font-medium text-emerald-950">{hasilImport.total_baris}</span> baris berhasil diimpor.
                {hasilImport.gagal.length > 0 && (
                  <span className="text-red-600"> {hasilImport.gagal.length} baris gagal.</span>
                )}
              </p>
              {hasilImport.kelas_tidak_ditemukan.length > 0 && (
                <p className="text-gold-600">
                  Kelas tidak ditemukan (santri tetap dimasukkan tanpa kelas): {hasilImport.kelas_tidak_ditemukan.join(', ')}
                </p>
              )}
              {hasilImport.gagal.length > 0 && (
                <ul className="text-emerald-900/70 list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                  {hasilImport.gagal.map((g, i) => (
                    <li key={i}>Baris {g.baris}: {g.alasan}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          <p className="font-display text-lg mb-4">{editId ? 'Edit Santri' : 'Tambah Santri'}</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">NIS</label>
              <Input value={nis} onChange={(e) => setNis(e.target.value)} placeholder="Nomor induk santri" />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Nama Lengkap</label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama santri" required />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kelas</label>
              <Select value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
                <option value="">— Pilih kelas —</option>
                {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Jenis Kelamin</label>
              <Select value={jk} onChange={(e) => setJk(e.target.value)}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={loading}>{editId ? 'Simpan Perubahan' : 'Tambah Santri'}</Button>
              {editId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-sand-200 flex flex-col sm:flex-row gap-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIS..." className="sm:max-w-xs" />
            <Select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} className="sm:max-w-[200px]">
              <option value="">Semua kelas</option>
              {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </Select>
          </div>
          {list.length === 0 ? (
            <EmptyState title="Belum ada santri" description="Tambahkan santri pertama menggunakan formulir di samping." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                    <th className="px-5 py-3">NIS</th>
                    <th className="px-5 py-3">Nama</th>
                    <th className="px-5 py-3">Kelas</th>
                    <th className="px-5 py-3">JK</th>
                    <th className="px-5 py-3">Poin Pelanggaran</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                      <td className="px-5 py-3 text-emerald-900/70">{s.nis || '-'}</td>
                      <td className="px-5 py-3 font-medium text-emerald-950">{s.nama}</td>
                      <td className="px-5 py-3 text-emerald-900/70">{s.nama_kelas || '-'}</td>
                      <td className="px-5 py-3 text-emerald-900/70">{s.jk}</td>
                      <td className="px-5 py-3">
                        <span className={s.total_poin_pelanggaran > 50 ? 'text-red-600 font-medium' : 'text-emerald-900/70'}>
                          {s.total_poin_pelanggaran} pt
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button onClick={() => edit(s)} className="focus-ring text-emerald-900 hover:text-gold-600 text-xs font-medium">Edit</button>
                        <button onClick={() => remove(s.id)} className="focus-ring text-red-600 hover:text-red-700 text-xs font-medium">Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
