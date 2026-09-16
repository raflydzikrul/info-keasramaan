'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, PageHeader, Button, Select, EmptyState } from '@/components/ui';
import { tanggalLokalHariIni, bulanLokalIni } from '@/lib/tanggal';
import { apiGet, apiSend, pesanError } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/use-refetch-on-focus';

type Jurnal = {
  id: number; tanggal: string; shift: string; petugas: string;
  kegiatan: string | null; kondisi_asrama: string | null; kendala: string | null;
  tindak_lanjut: string | null; jumlah_santri_hadir: number | null; status: string;
};

const SHIFT_WARNA: Record<string, string> = {
  Pagi: 'bg-gold-100 text-gold-600 border-gold-100',
  Siang: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Sore: 'bg-orange-50 text-orange-700 border-orange-100',
  Malam: 'bg-emerald-950 text-white border-emerald-950'
};

export default function JurnalPiketPage() {
  const [modePeriode, setModePeriode] = useState<'bulan' | 'harian'>('bulan');
  const [bulan, setBulan] = useState(bulanLokalIni);
  const [tanggal, setTanggal] = useState(tanggalLokalHariIni);
  const [shift, setShift] = useState('');
  const [status, setStatus] = useState('');

  const [list, setList] = useState<Jurnal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const load = () => {
    const idPermintaanIni = ++requestIdRef.current;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (modePeriode === 'harian') params.set('tanggal', tanggal);
    else params.set('bulan', bulan);
    if (shift) params.set('shift', shift);
    if (status) params.set('status', status);

    apiGet<Jurnal[]>(`/api/piket?${params}`)
      .then((d) => {
        if (idPermintaanIni !== requestIdRef.current) return;
        setList(d);
      })
      .catch((e) => {
        if (idPermintaanIni !== requestIdRef.current) return;
        setError(pesanError(e));
        setList([]);
      })
      .finally(() => {
        if (idPermintaanIni === requestIdRef.current) setLoading(false);
      });
  };

  useEffect(() => { load(); }, [modePeriode, bulan, tanggal, shift, status]);
  useRefetchOnFocus(load);

  const hapus = async (id: number) => {
    if (!confirm('Hapus catatan jurnal piket ini?')) return;
    setError('');
    try {
      await apiSend(`/api/piket/${id}`, 'DELETE');
      load();
    } catch (e) {
      setError(pesanError(e));
    }
  };

  const jumlahPerluTindakLanjut = list.filter((j) => j.status === 'Perlu Tindak Lanjut').length;

  return (
    <div>
      <PageHeader
        title="Jurnal Piket Asrama"
        description="Catatan harian petugas piket: kegiatan, kondisi asrama, kendala, dan tindak lanjutnya"
        action={<Link href="/piket/input"><Button>+ Tulis Jurnal</Button></Link>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <Card className="p-4">
          <p className="text-xs text-emerald-900/50">Total Catatan</p>
          <p className="font-display text-2xl text-emerald-900">{list.length}</p>
        </Card>
        <Card className="p-4 border-l-4 !border-l-red-500">
          <p className="text-xs text-emerald-900/50">Perlu Tindak Lanjut</p>
          <p className="font-display text-2xl text-red-600">{jumlahPerluTindakLanjut}</p>
        </Card>
        <Card className="p-4 border-l-4 !border-l-emerald-600">
          <p className="text-xs text-emerald-900/50">Selesai</p>
          <p className="font-display text-2xl text-emerald-800">{list.length - jumlahPerluTindakLanjut}</p>
        </Card>
      </div>

      <Card className="p-4 mb-5 space-y-3">
        <div className="flex gap-1 bg-sand-100 p-1 rounded-lg w-fit">
          {(['bulan', 'harian'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModePeriode(m)}
              className={`focus-ring px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                modePeriode === m ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-900/60 hover:text-emerald-900'
              }`}
            >
              {m === 'bulan' ? 'Bulanan' : 'Harian'}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {modePeriode === 'bulan' ? (
            <input
              type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
              className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm sm:max-w-[180px]"
            />
          ) : (
            <input
              type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="focus-ring px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm sm:max-w-[180px]"
            />
          )}
          <Select value={shift} onChange={(e) => setShift(e.target.value)} className="sm:max-w-[160px]">
            <option value="">Semua shift</option>
            <option value="Pagi">Pagi</option>
            <option value="Siang">Siang</option>
            <option value="Sore">Sore</option>
            <option value="Malam">Malam</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[200px]">
            <option value="">Semua status</option>
            <option value="Selesai">Selesai</option>
            <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card><div className="py-14 text-center text-sm text-emerald-900/50">Memuat jurnal piket...</div></Card>
      ) : error ? (
        <Card>
          <div className="py-14 text-center px-4">
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 inline-block">{error}</p>
            <div className="mt-3"><Button variant="secondary" onClick={load}>Coba Lagi</Button></div>
          </div>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada jurnal"
            description="Belum ada catatan piket pada periode & filter yang dipilih. Klik 'Tulis Jurnal' untuk menambahkan."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((j) => {
            const dibuka = terbuka === j.id;
            return (
              <Card key={j.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${SHIFT_WARNA[j.shift] || 'bg-sand-100 border-sand-200'}`}>
                        {j.shift}
                      </span>
                      <span className="text-sm font-medium text-emerald-950">{j.tanggal}</span>
                      {j.status === 'Perlu Tindak Lanjut' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          Perlu Tindak Lanjut
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-emerald-900/70">
                      Petugas: <span className="font-medium text-emerald-950">{j.petugas}</span>
                      {j.jumlah_santri_hadir !== null && ` · ${j.jumlah_santri_hadir} santri hadir`}
                    </p>
                    {!dibuka && j.kegiatan && (
                      <p className="text-sm text-emerald-900/60 mt-1.5 line-clamp-2">{j.kegiatan}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setTerbuka(dibuka ? null : j.id)}
                      className="focus-ring text-xs font-medium text-emerald-900 hover:text-gold-600"
                    >
                      {dibuka ? 'Tutup' : 'Lihat Detail'}
                    </button>
                    <Link href={`/piket/input?id=${j.id}`} className="focus-ring text-xs font-medium text-emerald-900 hover:text-gold-600">
                      Edit
                    </Link>
                    <button onClick={() => hapus(j.id)} className="focus-ring text-xs font-medium text-red-600 hover:text-red-700">
                      Hapus
                    </button>
                  </div>
                </div>

                {dibuka && (
                  <div className="mt-4 pt-4 border-t border-sand-100 grid sm:grid-cols-2 gap-4 text-sm">
                    <Detail judul="Kegiatan Selama Piket" isi={j.kegiatan} />
                    <Detail judul="Kondisi Asrama" isi={j.kondisi_asrama} />
                    <Detail judul="Kendala" isi={j.kendala} />
                    <Detail judul="Tindak Lanjut" isi={j.tindak_lanjut} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ judul, isi }: { judul: string; isi: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/40 mb-1">{judul}</p>
      <p className="text-emerald-900/80 whitespace-pre-wrap">{isi || <span className="text-emerald-900/30">—</span>}</p>
    </div>
  );
}
