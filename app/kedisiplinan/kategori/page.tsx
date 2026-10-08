'use client';

import { useEffect, useState } from 'react';
import { Card, PageHeader, Button, Input, Select, Badge, EmptyState } from '@/components/ui';
import { apiGet, apiSend, pesanError } from '@/lib/api';

type Kategori = { id: number; nama: string; tingkat: string; poin: number };

export default function KategoriPage() {
  const [list, setList] = useState<Kategori[]>([]);
  const [nama, setNama] = useState('');
  const [tingkat, setTingkat] = useState('Ringan');
  const [poin, setPoin] = useState(5);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sukses, setSukses] = useState('');

  const load = () => {
    apiGet<Kategori[]>('/api/kategori-pelanggaran')
      .then(setList)
      .catch((e) => setError(pesanError(e)));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setNama(''); setTingkat('Ringan'); setPoin(5); setEditId(null); setError('');
  };

  const edit = (k: Kategori) => {
    setEditId(k.id); setNama(k.nama); setTingkat(k.tingkat); setPoin(k.poin);
    setError(''); setSukses('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    if (!poin || poin < 1) { setError('Poin harus berupa angka minimal 1'); return; }
    setSaving(true);
    setError(''); setSukses('');
    try {
      const payload = { nama: nama.trim(), tingkat, poin };
      if (editId) {
        await apiSend(`/api/kategori-pelanggaran/${editId}`, 'PUT', payload);
        setSukses('Kategori berhasil diperbarui.');
      } else {
        await apiSend('/api/kategori-pelanggaran', 'POST', payload);
        setSukses('Kategori berhasil ditambahkan.');
      }
      resetForm();
      load();
    } catch (err) {
      setError(pesanError(err));
    } finally {
      setSaving(false);
    }
  };

  const hapus = async (k: Kategori) => {
    if (!confirm(`Hapus kategori "${k.nama}"?`)) return;
    setError(''); setSukses('');
    try {
      await apiSend(`/api/kategori-pelanggaran/${k.id}`, 'DELETE');
      if (editId === k.id) resetForm();
      setSukses('Kategori berhasil dihapus.');
      load();
    } catch (err) {
      setError(pesanError(err));
    }
  };

  return (
    <div>
      <PageHeader title="Kategori Pelanggaran" description="Kelola master jenis pelanggaran beserta tingkat dan bobot poinnya" />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          <p className="font-display text-lg mb-4">{editId ? 'Edit Kategori' : 'Tambah Kategori'}</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Nama Pelanggaran</label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Terlambat sholat berjamaah" required />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Tingkat</label>
              <Select value={tingkat} onChange={(e) => setTingkat(e.target.value)}>
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Poin</label>
              <Input type="number" min={1} value={poin} onChange={(e) => setPoin(Number(e.target.value))} required />
            </div>

            {editId && (
              <p className="text-xs text-emerald-900/50 bg-sand-50 border border-sand-200 rounded-lg px-3 py-2">
                Perubahan poin hanya berlaku untuk pelanggaran yang dicatat <b>setelah ini</b>. Catatan lama tetap memakai poin saat dicatat.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </Button>
              {editId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}
            </div>

            {sukses && (
              <div className="text-sm text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-3.5 py-2.5">{sukses}</div>
            )}
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
            )}
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          {list.length === 0 ? (
            <EmptyState title="Belum ada kategori" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                    <th className="px-5 py-3">Nama Pelanggaran</th>
                    <th className="px-5 py-3">Tingkat</th>
                    <th className="px-5 py-3">Poin</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((k) => (
                    <tr
                      key={k.id}
                      className={`border-b border-sand-100 last:border-0 hover:bg-sand-50 ${editId === k.id ? 'bg-gold-100/40' : ''}`}
                    >
                      <td className="px-5 py-3 font-medium text-emerald-950">{k.nama}</td>
                      <td className="px-5 py-3"><Badge tingkat={k.tingkat} /></td>
                      <td className="px-5 py-3 text-emerald-900/70">{k.poin} pt</td>
                      <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => edit(k)} className="focus-ring text-emerald-900 hover:text-gold-600 text-xs font-medium">Edit</button>
                        <button onClick={() => hapus(k)} className="focus-ring text-red-600 hover:text-red-700 text-xs font-medium">Hapus</button>
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
