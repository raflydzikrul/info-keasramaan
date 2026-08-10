'use client';

import { useEffect, useState } from 'react';
import { Card, PageHeader, Button, Input, EmptyState } from '@/components/ui';

type Kelas = { id: number; nama: string; wali_kelas: string | null; jumlah_siswa: number };

export default function KelasPage() {
  const [list, setList] = useState<Kelas[]>([]);
  const [nama, setNama] = useState('');
  const [wali, setWali] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => fetch('/api/kelas').then((r) => r.json()).then(setList);
  useEffect(() => { load(); }, []);

  const resetForm = () => { setNama(''); setWali(''); setEditId(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    setLoading(true);
    const url = editId ? `/api/kelas/${editId}` : '/api/kelas';
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, wali_kelas: wali }) });
    setLoading(false);
    resetForm();
    load();
  };

  const edit = (k: Kelas) => { setEditId(k.id); setNama(k.nama); setWali(k.wali_kelas || ''); };

  const remove = async (id: number) => {
    if (!confirm('Hapus kelas ini? Santri di kelas ini akan menjadi tanpa kelas.')) return;
    await fetch(`/api/kelas/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Data Kelas" description="Kelola daftar kelas / kamar asrama beserta wali kelasnya" />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          <p className="font-display text-lg mb-4">{editId ? 'Edit Kelas' : 'Tambah Kelas'}</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Nama Kelas</label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: X IPA 1" required />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Wali Kelas</label>
              <Input value={wali} onChange={(e) => setWali(e.target.value)} placeholder="Nama wali kelas" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={loading}>{editId ? 'Simpan Perubahan' : 'Tambah Kelas'}</Button>
              {editId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          {list.length === 0 ? (
            <EmptyState title="Belum ada kelas" description="Tambahkan kelas pertama menggunakan formulir di samping." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                  <th className="px-5 py-3">Nama Kelas</th>
                  <th className="px-5 py-3">Wali Kelas</th>
                  <th className="px-5 py-3">Jumlah Santri</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((k) => (
                  <tr key={k.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50">
                    <td className="px-5 py-3 font-medium text-emerald-950">{k.nama}</td>
                    <td className="px-5 py-3 text-emerald-900/70">{k.wali_kelas || '-'}</td>
                    <td className="px-5 py-3 text-emerald-900/70">{k.jumlah_siswa}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button onClick={() => edit(k)} className="focus-ring text-emerald-900 hover:text-gold-600 text-xs font-medium">Edit</button>
                      <button onClick={() => remove(k.id)} className="focus-ring text-red-600 hover:text-red-700 text-xs font-medium">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
