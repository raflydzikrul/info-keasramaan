'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
} from '@/components/ui';
import { apiGet, apiSend, pesanError } from '@/lib/api';

type Kategori = {
  id: number;
  nama: string;
  tingkat: string;
  poin: number;
};

export default function KategoriPage() {
  const [list, setList] = useState<Kategori[]>([]);

  const [nama, setNama] = useState('');
  const [tingkat, setTingkat] = useState('Ringan');
  const [poin, setPoin] = useState(2);

  const [filterTingkat, setFilterTingkat] = useState('Semua');

  const [editingId, setEditingId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    apiGet<Kategori[]>('/api/kategori-pelanggaran')
      .then(setList)
      .catch((e) => setError(pesanError(e)));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setNama('');
    setTingkat('Ringan');
    setPoin(2);
    setEditingId(null);
    setError('');
  };

  const handleEdit = (kategori: Kategori) => {
    setEditingId(kategori.id);
    setNama(kategori.nama);
    setTingkat(kategori.tingkat);
    setPoin(kategori.poin);
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim()) {
      setError('Nama pelanggaran wajib diisi');
      return;
    }

    if (!poin || poin < 1) {
      setError('Poin harus berupa angka minimal 1');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingId !== null) {
        await apiSend('/api/kategori-pelanggaran', 'PUT', {
          id: editingId,
          nama: nama.trim(),
          tingkat,
          poin,
        });
      } else {
        await apiSend('/api/kategori-pelanggaran', 'POST', {
          nama: nama.trim(),
          tingkat,
          poin,
        });
      }

      resetForm();
      load();
    } catch (err) {
      setError(pesanError(err));
    } finally {
      setSaving(false);
    }
  };

  // Filter daftar pelanggaran berdasarkan tingkat
  const filteredList =
    filterTingkat === 'Semua'
      ? list
      : list.filter((k) => k.tingkat === filterTingkat);

  // Jumlah masing-masing kategori
  const jumlahRingan = list.filter((k) => k.tingkat === 'Ringan').length;
  const jumlahSedang = list.filter((k) => k.tingkat === 'Sedang').length;
  const jumlahBerat = list.filter((k) => k.tingkat === 'Berat').length;
  const jumlahSangatBerat = list.filter(
    (k) => k.tingkat === 'Sangat Berat'
  ).length;

  return (
    <div>
      <PageHeader
        title="Kategori Pelanggaran"
        description="Kelola master jenis pelanggaran beserta tingkat dan bobot poinnya"
      />

      <div className="grid lg:grid-cols-3 gap-5">

        {/* FORM TAMBAH / EDIT */}
        <Card className="p-5 lg:col-span-1 h-fit">
          <p className="font-display text-lg mb-4">
            {editingId !== null ? 'Edit Kategori' : 'Tambah Kategori'}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                Nama Pelanggaran
              </label>

              <Input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Terlambat sholat berjamaah"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                Tingkat
              </label>

              <Select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
              >
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
                <option value="Sangat Berat">Sangat Berat</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                Poin
              </label>

              <Input
                type="number"
                min={1}
                value={poin}
                onChange={(e) => setPoin(Number(e.target.value))}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Menyimpan...'
                  : editingId !== null
                    ? 'Simpan Perubahan'
                    : 'Tambah Kategori'}
              </Button>

              {editingId !== null && (
                <Button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Batal
                </Button>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}
          </form>
        </Card>

        {/* DAFTAR PELANGGARAN */}
        <Card className="lg:col-span-2 overflow-hidden">

          {/* HEADER FILTER */}
          <div className="px-5 pt-5 pb-4 border-b border-sand-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              <div>
                <p className="font-display text-lg">
                  Daftar Pelanggaran
                </p>

                <p className="text-xs text-emerald-900/50 mt-0.5">
                  Menampilkan {filteredList.length} dari {list.length} pelanggaran
                </p>
              </div>

              <div className="w-full sm:w-48">
                <Select
                  value={filterTingkat}
                  onChange={(e) => setFilterTingkat(e.target.value)}
                >
                  <option value="Semua">
                    Semua ({list.length})
                  </option>

                  <option value="Ringan">
                    Ringan ({jumlahRingan})
                  </option>

                  <option value="Sedang">
                    Sedang ({jumlahSedang})
                  </option>

                  <option value="Berat">
                    Berat ({jumlahBerat})
                  </option>

                  <option value="Sangat Berat">
                    Sangat Berat ({jumlahSangatBerat})
                  </option>
                </Select>
              </div>

            </div>
          </div>

          {/* TABLE */}
          {filteredList.length === 0 ? (
            <EmptyState
              title={
                filterTingkat === 'Semua'
                  ? 'Belum ada kategori'
                  : `Belum ada pelanggaran ${filterTingkat}`
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                    <th className="px-5 py-3">
                      Nama Pelanggaran
                    </th>

                    <th className="px-5 py-3">
                      Tingkat
                    </th>

                    <th className="px-5 py-3">
                      Poin
                    </th>

                    <th className="px-5 py-3 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredList.map((k) => (
                    <tr
                      key={k.id}
                      className="border-b border-sand-100 last:border-0 hover:bg-sand-50"
                    >
                      <td className="px-5 py-3 font-medium text-emerald-950">
                        {k.nama}
                      </td>

                      <td className="px-5 py-3">
                        <Badge tingkat={k.tingkat} />
                      </td>

                      <td className="px-5 py-3 text-emerald-900/70">
                        {k.poin} pt
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleEdit(k)}
                          className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        >
                          Edit
                        </button>
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