'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  PageHeader,
  Button,
  Select,
  Input,
  Textarea,
  Badge,
} from '@/components/ui';
import { tanggalLokalHariIni } from '@/lib/tanggal';
import { apiGet, apiSend, pesanError } from '@/lib/api';

type Kelas = {
  id: number;
  nama: string;
};

type Siswa = {
  id: number;
  nama: string;
  nis: string | null;
};

type Kategori = {
  id: number;
  nama: string;
  tingkat: string;
  poin: number;
};

type PelanggaranDetail = {
  id: number;
  siswa_id: number;
  kategori_id: number;
  tanggal: string;
  keterangan: string | null;
  petugas: string | null;
  kelas_id: number | null;
};

function FormPelanggaran() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState('');

  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [siswaId, setSiswaId] = useState('');

  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [tingkat, setTingkat] = useState('');
  const [kategoriId, setKategoriId] = useState('');

  const [tanggal, setTanggal] = useState(tanggalLokalHariIni);
  const [keterangan, setKeterangan] = useState('');
  const [petugas, setPetugas] = useState('');

  const [memuat, setMemuat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Memuat data kelas dan kategori pelanggaran
  useEffect(() => {
    apiGet<Kelas[]>('/api/kelas')
      .then(setKelasList)
      .catch(() => {});

    apiGet<Kategori[]>('/api/kategori-pelanggaran')
      .then(setKategoriList)
      .catch(() => {});
  }, []);

  // Memuat daftar siswa berdasarkan kelas
  useEffect(() => {
    if (!kelasId) {
      setSiswaList([]);
      return;
    }

    apiGet<Siswa[]>(`/api/siswa?kelas_id=${kelasId}`)
      .then(setSiswaList)
      .catch(() => {});
  }, [kelasId]);

  // Mode edit: memuat data pelanggaran lama
  useEffect(() => {
    if (!editId) return;

    setMemuat(true);
    setError('');

    apiGet<PelanggaranDetail>(`/api/pelanggaran/${editId}`)
      .then((d) => {
        setKelasId(d.kelas_id ? String(d.kelas_id) : '');
        setSiswaId(String(d.siswa_id));
        setKategoriId(String(d.kategori_id));
        setTanggal(d.tanggal);
        setKeterangan(d.keterangan || '');
        setPetugas(d.petugas || '');
      })
      .catch((e) => setError(pesanError(e)))
      .finally(() => setMemuat(false));
  }, [editId]);

  // Saat kategori pelanggaran terpilih,
  // otomatis menentukan tingkatnya.
  useEffect(() => {
    if (!kategoriId || kategoriList.length === 0) return;

    const kategori = kategoriList.find(
      (k) => String(k.id) === kategoriId
    );

    if (kategori) {
      setTingkat(kategori.tingkat);
    }
  }, [kategoriId, kategoriList]);

  // Daftar pelanggaran hanya berdasarkan kategori/tingkat yang dipilih
  const pelanggaranTerfilter = kategoriList.filter(
    (k) => k.tingkat === tingkat
  );

  const kategoriTerpilih = kategoriList.find(
    (k) => String(k.id) === kategoriId
  );

  const resetForm = () => {
    setKelasId('');
    setSiswaId('');
    setTingkat('');
    setKategoriId('');
    setTanggal(tanggalLokalHariIni());
    setKeterangan('');
    setPetugas('');
    setSuccess('');
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!siswaId || !kategoriId) {
      setError('Silakan pilih santri dan pelanggaran terlebih dahulu.');
      return;
    }

    setSaving(true);
    setSuccess('');
    setError('');

    const payload = {
      siswa_id: siswaId,
      kategori_id: kategoriId,
      tanggal,
      keterangan,
      petugas,
    };

    try {
      if (editId) {
        await apiSend(
          `/api/pelanggaran/${editId}`,
          'PUT',
          payload
        );

        setSuccess('Perubahan berhasil disimpan.');

        setTimeout(() => {
          router.push('/kedisiplinan');
        }, 800);
      } else {
        await apiSend(
          '/api/pelanggaran',
          'POST',
          payload
        );

        setSuccess('Pelanggaran berhasil dicatat.');

        // Setelah menyimpan, kategori dan jenis pelanggaran
        // dikosongkan agar bisa input pelanggaran berikutnya.
        setKategoriId('');
        setTingkat('');
        setKeterangan('');
      }
    } catch (err) {
      setError(pesanError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={editId ? 'Edit Pelanggaran' : 'Input Pelanggaran'}
        description={
          editId
            ? 'Ubah catatan pelanggaran yang sudah ada'
            : 'Catat pelanggaran santri sesuai kategori dan tingkat keparahannya'
        }
        action={
          editId ? (
            <Button
              variant="secondary"
              onClick={() => router.push('/kedisiplinan')}
            >
              Kembali ke Daftar
            </Button>
          ) : undefined
        }
      />

      {memuat ? (
        <Card className="p-6 text-sm text-emerald-900/50">
          Memuat data pelanggaran...
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-6 lg:col-span-2">
            <form onSubmit={submit} className="space-y-4">

              {/* KELAS & SANTRI */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                    Kelas
                  </label>

                  <Select
                    value={kelasId}
                    onChange={(e) => {
                      setKelasId(e.target.value);
                      setSiswaId('');
                    }}
                    required
                  >
                    <option value="">— Pilih kelas —</option>

                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                    Santri
                  </label>

                  <Select
                    value={siswaId}
                    onChange={(e) => setSiswaId(e.target.value)}
                    required
                    disabled={!kelasId}
                  >
                    <option value="">— Pilih santri —</option>

                    {siswaList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* KATEGORI */}
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                  Kategori
                </label>

                <Select
                  value={tingkat}
                  onChange={(e) => {
                    setTingkat(e.target.value);
                    setKategoriId('');
                  }}
                  required
                >
                  <option value="">— Pilih kategori —</option>
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                  <option value="Sangat Berat">Sangat Berat</option>
                </Select>
              </div>

              {/* PELANGGARAN */}
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                  Pelanggaran
                </label>

                <Select
                  value={kategoriId}
                  onChange={(e) => setKategoriId(e.target.value)}
                  required
                  disabled={!tingkat}
                >
                  <option value="">
                    {tingkat
                      ? '— Pilih pelanggaran —'
                      : '— Pilih kategori terlebih dahulu —'}
                  </option>

                  {pelanggaranTerfilter.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.poin} poin)
                    </option>
                  ))}
                </Select>
              </div>

              {/* INFORMASI POIN */}
              {kategoriTerpilih && (
                <div className="flex items-center gap-2 text-sm bg-sand-50 border border-sand-200 rounded-lg px-4 py-2.5">
                  <Badge tingkat={kategoriTerpilih.tingkat} />

                  <span className="text-emerald-900/70">
                    akan menambah
                  </span>

                  <span className="font-semibold text-emerald-950">
                    {kategoriTerpilih.poin} poin
                  </span>
                </div>
              )}

              {/* TANGGAL & PETUGAS */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                    Tanggal Kejadian
                  </label>

                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    required
                    className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                    Petugas / Pencatat
                  </label>

                  <Input
                    value={petugas}
                    onChange={(e) => setPetugas(e.target.value)}
                    placeholder="Nama pengasuh/musyrif"
                  />
                </div>
              </div>

              {/* KETERANGAN */}
              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
                  Keterangan (opsional)
                </label>

                <Textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={3}
                  placeholder="Detail kejadian, lokasi, saksi, dll."
                />
              </div>

              {/* PESAN */}
              {success && (
                <div className="text-sm text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-4 py-2.5">
                  {success}
                </div>
              )}

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              {/* TOMBOL */}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving
                    ? 'Menyimpan...'
                    : editId
                      ? 'Simpan Perubahan'
                      : 'Simpan Pelanggaran'}
                </Button>

                {!editId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                  >
                    Bersihkan Form
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* PANDUAN */}
          <Card className="p-5 h-fit">
            <p className="font-display text-lg mb-3">
              Panduan Poin
            </p>

            <ul className="text-sm space-y-2 text-emerald-900/70">
              <li className="flex justify-between">
                <span>Ringan</span>
                <span>5–10 poin</span>
              </li>

              <li className="flex justify-between">
                <span>Sedang</span>
                <span>25–50 poin</span>
              </li>

              <li className="flex justify-between">
                <span>Berat</span>
                <span>75–100 poin</span>
              </li>

              <li className="flex justify-between">
                <span>Sangat Berat</span>
                <span>Sesuai pengaturan</span>
              </li>
            </ul>

            <p className="text-xs text-emerald-900/50 mt-4">
              Kelola daftar kategori di menu{' '}
              <span className="font-medium">
                Kategori Pelanggaran
              </span>{' '}
              jika perlu menambah jenis pelanggaran baru.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function InputPelanggaranPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-6 text-sm text-emerald-900/50">
          Memuat...
        </Card>
      }
    >
      <FormPelanggaran />
    </Suspense>
  );
}