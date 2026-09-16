'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, PageHeader, Button, Input, Select, Textarea } from '@/components/ui';
import { tanggalLokalHariIni } from '@/lib/tanggal';
import { apiGet, apiSend, pesanError } from '@/lib/api';

type Jurnal = {
  id: number; tanggal: string; shift: string; petugas: string;
  kegiatan: string | null; kondisi_asrama: string | null; kendala: string | null;
  tindak_lanjut: string | null; jumlah_santri_hadir: number | null; status: string;
};

function FormJurnalPiket() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [tanggal, setTanggal] = useState(tanggalLokalHariIni);
  const [shift, setShift] = useState('Pagi');
  const [petugas, setPetugas] = useState('');
  const [jumlahHadir, setJumlahHadir] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [kondisi, setKondisi] = useState('');
  const [kendala, setKendala] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [status, setStatus] = useState('Selesai');

  const [memuat, setMemuat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sukses, setSukses] = useState('');

  // Kalau ada ?id= di URL, muat data lama untuk diedit
  useEffect(() => {
    if (!editId) return;
    setMemuat(true);
    setError('');
    apiGet<Jurnal>(`/api/piket/${editId}`)
      .then(isiForm)
      .catch((e) => setError(pesanError(e)))
      .finally(() => setMemuat(false));
  }, [editId]);

  const isiForm = (j: Jurnal) => {
    setTanggal(j.tanggal);
    setShift(j.shift);
    setPetugas(j.petugas);
    setJumlahHadir(j.jumlah_santri_hadir === null ? '' : String(j.jumlah_santri_hadir));
    setKegiatan(j.kegiatan || '');
    setKondisi(j.kondisi_asrama || '');
    setKendala(j.kendala || '');
    setTindakLanjut(j.tindak_lanjut || '');
    setStatus(j.status);
  };

  const resetForm = () => {
    setTanggal(tanggalLokalHariIni());
    setShift('Pagi'); setPetugas(''); setJumlahHadir('');
    setKegiatan(''); setKondisi(''); setKendala(''); setTindakLanjut('');
    setStatus('Selesai');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal || !shift || !petugas.trim()) {
      setError('Tanggal, shift, dan nama petugas wajib diisi');
      return;
    }
    setSaving(true); setError(''); setSukses('');

    const payload = {
      tanggal, shift, petugas: petugas.trim(),
      jumlah_santri_hadir: jumlahHadir === '' ? null : Number(jumlahHadir),
      kegiatan, kondisi_asrama: kondisi, kendala, tindak_lanjut: tindakLanjut, status
    };

    try {
      if (editId) {
        await apiSend(`/api/piket/${editId}`, 'PUT', payload);
        setSukses('Perubahan jurnal berhasil disimpan.');
        setTimeout(() => router.push('/piket'), 800);
      } else {
        await apiSend('/api/piket', 'POST', payload);
        setSukses('Jurnal piket berhasil dicatat.');
        resetForm();
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
        title={editId ? 'Edit Jurnal Piket' : 'Tulis Jurnal Piket'}
        description="Catat kegiatan, kondisi asrama, kendala, dan tindak lanjut selama bertugas"
        action={<Button variant="secondary" onClick={() => router.push('/piket')}>Kembali ke Daftar</Button>}
      />

      {memuat ? (
        <Card className="p-6 text-sm text-emerald-900/50">Memuat data jurnal...</Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-6 lg:col-span-2">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Tanggal</label>
                  <input
                    type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required
                    className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Shift</label>
                  <Select value={shift} onChange={(e) => setShift(e.target.value)}>
                    <option value="Pagi">Pagi</option>
                    <option value="Siang">Siang</option>
                    <option value="Sore">Sore</option>
                    <option value="Malam">Malam</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Jumlah Santri Hadir</label>
                  <Input
                    type="number" min={0} value={jumlahHadir}
                    onChange={(e) => setJumlahHadir(e.target.value)}
                    placeholder="opsional"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Nama Petugas Piket</label>
                <Input value={petugas} onChange={(e) => setPetugas(e.target.value)} placeholder="Nama musyrif/pengasuh yang bertugas" required />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kegiatan Selama Piket</label>
                <Textarea value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} rows={3}
                  placeholder="Contoh: membangunkan santri sholat subuh, mendampingi tahfidz, mengecek kebersihan kamar..." />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kondisi Asrama</label>
                <Textarea value={kondisi} onChange={(e) => setKondisi(e.target.value)} rows={2}
                  placeholder="Contoh: kondisi aman dan tertib, kebersihan kamar cukup baik..." />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Kendala / Kejadian</label>
                <Textarea value={kendala} onChange={(e) => setKendala(e.target.value)} rows={2}
                  placeholder="Contoh: keran kamar mandi bocor, ada santri sakit demam..." />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Tindak Lanjut</label>
                <Textarea value={tindakLanjut} onChange={(e) => setTindakLanjut(e.target.value)} rows={2}
                  placeholder="Contoh: sudah dilaporkan ke bagian sarpras, santri dibawa ke klinik..." />
              </div>

              <div>
                <label className="text-xs font-medium text-emerald-900/60 mb-1 block">Status</label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Selesai">Selesai</option>
                  <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
                </Select>
              </div>

              {sukses && (
                <div className="text-sm text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-4 py-2.5">{sukses}</div>
              )}
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Jurnal'}
              </Button>
            </form>
          </Card>

          <Card className="p-5 h-fit">
            <p className="font-display text-lg mb-3">Tips Pengisian</p>
            <ul className="text-sm space-y-2 text-emerald-900/70 list-disc list-inside">
              <li>Isi jurnal di akhir shift selagi kejadian masih segar diingat.</li>
              <li>Tulis kendala sekonkret mungkin (lokasi, waktu, siapa yang terlibat).</li>
              <li>Pilih <b>Perlu Tindak Lanjut</b> kalau masalahnya belum selesai di shift ini, supaya petugas berikutnya tahu.</li>
              <li>Jumlah santri hadir boleh dikosongkan kalau tidak dilakukan pengecekan.</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function InputJurnalPiketPage() {
  return (
    <Suspense fallback={<Card className="p-6 text-sm text-emerald-900/50">Memuat...</Card>}>
      <FormJurnalPiket />
    </Suspense>
  );
}
