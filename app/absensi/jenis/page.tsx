'use client';

import { useEffect, useState } from 'react';
import { Card, PageHeader, Button, Input, Select, EmptyState } from '@/components/ui';

type Jenis = { id: number; nama: string; kategori: 'Wajib' | 'Sunnah' | 'Kegiatan'; urutan: number };

const KATEGORI_LABEL: Record<string, string> = {
  Wajib: 'Sholat Wajib',
  Sunnah: 'Sholat Sunnah',
  Kegiatan: 'Kegiatan Lain'
};

export default function JenisAbsensiPage() {
  const [list, setList] = useState<Jenis[]>([]);
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<'Wajib' | 'Sunnah' | 'Kegiatan'>('Sunnah');
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => fetch('/api/jenis-absensi').then((r) => r.json()).then(setList);
  useEffect(() => { load(); }, []);

  const resetForm = () => { setNama(''); setKategori('Sunnah'); setEditId(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;
    setSaving(true);
    const url = editId ? `/api/jenis-absensi/${editId}` : '/api/jenis-absensi';
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, kategori }) });
    setSaving(false);
    resetForm();
    load();
  };

  const edit = (j: Jenis) => { setEditId(j.id); setNama(j.nama); setKategori(j.kategori); };

  const remove = async (id: number) => {
    if (!confirm('Hapus jenis absensi ini? Seluruh riwayat absensi untuk jenis ini juga akan terhapus.')) return;
    await fetch(`/api/jenis-absensi/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="Jenis Absensi"
        description="Kelola daftar Sholat Wajib, Sholat Sunnah, dan Kegiatan Lain yang muncul di halaman Absensi"
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          <p className="font-display text-lg mb-4">{editId ? 'Edit Jenis Absensi' : 'Tambah Jenis Absensi'}</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Nama</label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Muhasabah Malam" required />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kategori</label>
              <Select value={kategori} onChange={(e) => setKategori(e.target.value as any)}>
                <option value="Wajib">Sholat Wajib</option>
                <option value="Sunnah">Sholat Sunnah</option>
                <option value="Kegiatan">Kegiatan Lain</option>
              </Select>
              <p className="text-xs text-emerald-900/40 mt-1">
                Kategori "Sholat Wajib" sebaiknya tetap 5 waktu standar. Tambah/edit lebih aman di kategori Sunnah atau Kegiatan.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving}>{editId ? 'Simpan Perubahan' : 'Tambah'}</Button>
              {editId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          {list.length === 0 ? (
            <EmptyState title="Belum ada jenis absensi" />
          ) : (
            (['Wajib', 'Sunnah', 'Kegiatan'] as const).map((kat) => {
              const items = list.filter((j) => j.kategori === kat);
              if (items.length === 0) return null;
              return (
                <div key={kat} className="border-b border-sand-200 last:border-0">
                  <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-emerald-900/50">
                    {KATEGORI_LABEL[kat]}
                  </p>
                  <table className="w-full text-sm">
                    <tbody>
                      {items.map((j) => (
                        <tr key={j.id} className="border-t border-sand-100 hover:bg-sand-50">
                          <td className="px-5 py-2.5 font-medium text-emerald-950">{j.nama}</td>
                          <td className="px-5 py-2.5 text-right space-x-2">
                            <button onClick={() => edit(j)} className="focus-ring text-emerald-900 hover:text-gold-600 text-xs font-medium">Edit</button>
                            <button onClick={() => remove(j.id)} className="focus-ring text-red-600 hover:text-red-700 text-xs font-medium">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
