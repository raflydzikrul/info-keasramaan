'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, PageHeader, Button, Select, EmptyState } from '@/components/ui';
import { tanggalLokalHariIni } from '@/lib/tanggal';
import { useRefetchOnFocus } from '@/lib/use-refetch-on-focus';

type Kelas = { id: number; nama: string };
type Jenis = {
  id: number;
  nama: string;
  kategori: 'Wajib' | 'Sunnah' | 'Kegiatan';
};
type SiswaRow = { id: number; nis: string | null; nama: string };
type Existing = {
  siswa_id: number;
  jenis_id: number;
  status: string;
  keterangan: string | null;
};

type Entry = {
  siswa_id: number;
  jenis_id: number;
  status: string;
};

const STATUS_OPTIONS = [
  'Hadir',
  'Terlambat',
  'Alpa',
  'Izin',
  'Sakit'
] as const;

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
  const [tanggal, setTanggal] = useState(tanggalLokalHariIni);
  const [kategoriTab, setKategoriTab] = useState<
    'Wajib' | 'Sunnah' | 'Kegiatan'
  >('Wajib');

  const [siswa, setSiswa] = useState<SiswaRow[]>([]);
  const [jenis, setJenis] = useState<Jenis[]>([]);

  // Data yang sedang ditampilkan / diedit
  const [grid, setGrid] = useState<Record<string, string>>({});

  // Data yang benar-benar sudah tersimpan di server
  const [gridTersimpan, setGridTersimpan] = useState<
    Record<string, string>
  >({});

  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const requestIdRef = useRef(0);

  useEffect(() => {
    fetch('/api/kelas', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setKelasList(d);

        if (d[0]) {
          setKelasId(String(d[0].id));
        }
      })
      .catch(() => {
        setErrorMsg('Gagal memuat daftar kelas.');
      });
  }, []);

  const loadGrid = () => {
    if (!kelasId || !tanggal) return;

    const idPermintaanIni = ++requestIdRef.current;

    setLoadingGrid(true);
    setErrorMsg('');

    fetch(
      `/api/absensi?kelas_id=${kelasId}&tanggal=${tanggal}`,
      {
        cache: 'no-store'
      }
    )
      .then(async (r) => {
        const d = await r.json();

        // Abaikan response lama
        if (idPermintaanIni !== requestIdRef.current) {
          return;
        }

        if (!r.ok) {
          setErrorMsg(
            d.error || 'Gagal memuat data absensi'
          );

          setSiswa([]);
          setJenis([]);
          setGrid({});
          setGridTersimpan({});

          return;
        }

        setSiswa(d.siswa || []);
        setJenis(d.jenis || []);

        const g: Record<string, string> = {};

        /*
         * Hanya data yang memang sudah ada di database
         * yang dimasukkan ke grid.
         *
         * Data kosong TIDAK dibuat menjadi Alpa.
         */
        (d.existing || []).forEach((e: Existing) => {
          const key = `${e.siswa_id}-${e.jenis_id}`;

          if (g[key] === undefined && e.status) {
            g[key] = e.status;
          }
        });

        setGrid(g);
        setGridTersimpan(g);
      })
      .catch(() => {
        if (idPermintaanIni !== requestIdRef.current) {
          return;
        }

        setErrorMsg(
          'Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.'
        );
      })
      .finally(() => {
        if (idPermintaanIni === requestIdRef.current) {
          setLoadingGrid(false);
        }
      });
  };

  useEffect(() => {
    loadGrid();
    setSavedMsg('');
  }, [kelasId, tanggal]);

  const jenisTampil = useMemo(
    () =>
      jenis.filter(
        (j) => j.kategori === kategoriTab
      ),
    [jenis, kategoriTab]
  );

  /*
   * Menghitung jumlah data yang benar-benar sudah tersimpan
   * pada server.
   */
  const jumlahTersimpan = useMemo(() => {
    let n = 0;

    siswa.forEach((s) => {
      jenisTampil.forEach((j) => {
        const key = `${s.id}-${j.id}`;

        if (gridTersimpan[key]) {
          n++;
        }
      });
    });

    return n;
  }, [siswa, jenisTampil, gridTersimpan]);

  /*
   * Mengecek apakah ada perubahan yang belum disimpan.
   */
  const adaPerubahan = useMemo(() => {
    return siswa.some((s) =>
      jenisTampil.some((j) => {
        const key = `${s.id}-${j.id}`;

        return (
          (grid[key] || '') !==
          (gridTersimpan[key] || '')
        );
      })
    );
  }, [
    siswa,
    jenisTampil,
    grid,
    gridTersimpan
  ]);

  /*
   * Reload otomatis saat browser kembali aktif.
   * Tidak dilakukan jika masih ada perubahan yang belum disimpan.
   */
  useRefetchOnFocus(() => {
    if (!adaPerubahan) {
      loadGrid();
    }
  });

  /*
   * Mengubah status sebuah sel.
   *
   * Jika status yang sama diklik lagi:
   * → sel dikosongkan.
   *
   * Sel kosong TIDAK dianggap Alpa.
   */
  const setStatus = (
    siswaId: number,
    jenisId: number,
    status: string
  ) => {
    const key = `${siswaId}-${jenisId}`;

    setSavedMsg('');

    setGrid((prev) => {
      // Klik status yang sama = kosongkan
      if (prev[key] === status) {
        const next = { ...prev };

        delete next[key];

        return next;
      }

      return {
        ...prev,
        [key]: status
      };
    });
  };

  /*
   * Tandai seluruh kolom yang sedang dibuka sebagai Hadir.
   */
  const tandaiSemuaHadir = () => {
    setSavedMsg('');

    const g = { ...grid };

    siswa.forEach((s) => {
      jenisTampil.forEach((j) => {
        g[`${s.id}-${j.id}`] = 'Hadir';
      });
    });

    setGrid(g);
  };

  /*
   * Batalkan semua perubahan yang belum disimpan.
   */
  const batalkanPerubahan = () => {
    setGrid(gridTersimpan);
    setSavedMsg('');
    setErrorMsg('');
  };

  /*
   * SIMPAN ABSENSI
   *
   * Prinsip utama:
   *
   * 1. Hanya sel yang memiliki status yang dikirim.
   * 2. Sel kosong tidak dikirim.
   * 3. Backend juga melakukan validasi.
   * 4. Tidak ada fallback ke Alpa atau Hadir.
   */
  const simpan = async () => {
    setSaving(true);
    setSavedMsg('');
    setErrorMsg('');

    const entries: Entry[] = [];

    siswa.forEach((s) => {
      jenisTampil.forEach((j) => {
        const key = `${s.id}-${j.id}`;
        const nilai = grid[key];

        /*
         * PENTING:
         *
         * Kalau nilai kosong:
         * → jangan masukkan ke entries.
         *
         * Jadi data kosong tidak akan dikirim
         * dan tidak akan disimpan sebagai Alpa.
         */
        if (
          typeof nilai === 'string' &&
          nilai.trim() !== ''
        ) {
          entries.push({
            siswa_id: s.id,
            jenis_id: j.id,
            status: nilai
          });
        }
      });
    });

    /*
     * Jangan kirim request kosong.
     */
    if (entries.length === 0) {
      setSaving(false);

      setErrorMsg(
        'Tidak ada data untuk disimpan. Tandai minimal satu status terlebih dahulu.'
      );

      return;
    }

    try {
      const res = await fetch('/api/absensi', {
        cache: 'no-store',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tanggal,
          entries
        })
      });

      const data = await res
        .json()
        .catch(() => ({}));

      /*
       * Server gagal.
       */
      if (!res.ok) {
        setErrorMsg(
          data.error ||
            `Gagal menyimpan (kode ${res.status}). Data BELUM tersimpan, silakan coba lagi.`
        );

        return;
      }

      const jumlahDikonfirmasiServer =
        typeof data.jumlah === 'number'
          ? data.jumlah
          : null;

      const label =
        kategoriTab === 'Wajib'
          ? 'sholat wajib'
          : kategoriTab === 'Sunnah'
          ? 'sholat sunnah'
          : 'kegiatan';

      /*
       * Pastikan jumlah data yang dikirim
       * sama dengan jumlah yang dikonfirmasi server.
       */
      if (
        jumlahDikonfirmasiServer !== null &&
        jumlahDikonfirmasiServer !== entries.length
      ) {
        setErrorMsg(
          `Peringatan: kamu mengirim ${entries.length} catatan, tetapi server hanya mengonfirmasi ${jumlahDikonfirmasiServer} catatan tersimpan. Sebagian data mungkin tidak tersimpan.`
        );
      } else {
        setSavedMsg(
          `Tersimpan · ${
            jumlahDikonfirmasiServer ??
            entries.length
          } catatan absensi ${label} tanggal ${tanggal}`
        );
      }

      /*
       * Ambil ulang data dari server.
       * Ini memastikan tampilan sesuai dengan database.
       */
      loadGrid();
    } catch {
      setErrorMsg(
        'Tidak bisa terhubung ke server. Data BELUM tersimpan, periksa koneksi lalu coba lagi.'
      );
    } finally {
      setSaving(false);
    }
  };

  const sudahAdaData =
    jumlahTersimpan > 0;

  return (
    <div>
      <PageHeader
        title="Absensi Sholat & Kegiatan"
        description="Catat dan ubah kehadiran sholat wajib, sholat sunnah, dan kegiatan per kelas setiap hari"
      />

      <Card className="p-4 mb-5 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
            Kelas
          </label>

          <Select
            value={kelasId}
            onChange={(e) =>
              setKelasId(e.target.value)
            }
          >
            {kelasList.map((k) => (
              <option
                key={k.id}
                value={k.id}
              >
                {k.nama}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-emerald-900/60 mb-1 block">
            Tanggal
          </label>

          <input
            type="date"
            value={tanggal}
            onChange={(e) =>
              setTanggal(e.target.value)
            }
            className="focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm"
          />
        </div>

        <Button
          variant="secondary"
          onClick={tandaiSemuaHadir}
          disabled={siswa.length === 0}
        >
          Tandai semua Hadir
        </Button>

        {adaPerubahan && (
          <Button
            variant="ghost"
            onClick={batalkanPerubahan}
          >
            Batalkan Perubahan
          </Button>
        )}

        <Button
          onClick={simpan}
          disabled={
            saving ||
            siswa.length === 0
          }
        >
          {saving
            ? 'Menyimpan...'
            : sudahAdaData
            ? 'Simpan Perubahan'
            : 'Simpan Absensi'}
        </Button>
      </Card>

      {!loadingGrid &&
        siswa.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            {sudahAdaData ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>

                Sudah ada {jumlahTersimpan}{' '}
                catatan tersimpan — mode edit
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-sand-100 text-emerald-900/60 text-xs font-medium">
                Belum ada absensi tersimpan untuk tanggal & jenis ini
              </span>
            )}

            {adaPerubahan && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gold-100 text-gold-600 text-xs font-medium">
                Ada perubahan yang belum disimpan
              </span>
            )}
          </div>
        )}

      {savedMsg && (
        <div className="mb-4 text-sm text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-4 py-2.5">
          {savedMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-sand-100 p-1 rounded-lg w-fit">
        {(
          [
            'Wajib',
            'Sunnah',
            'Kegiatan'
          ] as const
        ).map((t) => (
          <button
            key={t}
            onClick={() => {
              setKategoriTab(t);
              setSavedMsg('');
            }}
            className={`focus-ring px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              kategoriTab === t
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-emerald-900/60 hover:text-emerald-900'
            }`}
          >
            {t === 'Wajib'
              ? 'Sholat Wajib'
              : t === 'Sunnah'
              ? 'Sholat Sunnah'
              : 'Kegiatan Lain'}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto">
        {loadingGrid ? (
          <div className="py-14 text-center text-sm text-emerald-900/50">
            Memuat data absensi...
          </div>
        ) : siswa.length === 0 ? (
          <EmptyState
            title="Belum ada santri di kelas ini"
            description="Tambahkan santri terlebih dahulu di menu Data Santri."
          />
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-emerald-900/50 border-b border-sand-200">
                <th className="px-5 py-3 sticky left-0 bg-white">
                  Nama Santri
                </th>

                {jenisTampil.map((j) => (
                  <th
                    key={j.id}
                    className="px-3 py-3 text-center whitespace-nowrap"
                  >
                    {j.nama}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {siswa.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-sand-100 last:border-0 hover:bg-sand-50"
                >
                  <td className="px-5 py-2.5 font-medium text-emerald-950 sticky left-0 bg-white whitespace-nowrap">
                    {s.nama}
                  </td>

                  {jenisTampil.map((j) => {
                    const key = `${s.id}-${j.id}`;

                    const current =
                      grid[key] || '';

                    const berubah =
                      (grid[key] || '') !==
                      (gridTersimpan[key] || '');

                    return (
                      <td
                        key={j.id}
                        className={`px-3 py-2 text-center ${
                          berubah
                            ? 'bg-gold-100/40'
                            : ''
                        }`}
                      >
                        <div className="flex justify-center gap-1">
                          {STATUS_OPTIONS.map(
                            (st) => (
                              <button
                                key={st}
                                type="button"
                                title={`${st}${
                                  current === st
                                    ? ' (klik lagi untuk batalkan)'
                                    : ''
                                }`}
                                onClick={() =>
                                  setStatus(
                                    s.id,
                                    j.id,
                                    st
                                  )
                                }
                                className={`focus-ring w-6 h-6 rounded-md text-[10px] font-bold border transition-colors ${
                                  current === st
                                    ? STATUS_COLOR[
                                        st
                                      ] +
                                      ' border-transparent'
                                    : 'bg-white border-sand-200 text-emerald-900/30 hover:border-emerald-300'
                                }`}
                              >
                                {st[0]}
                              </button>
                            )
                          )}
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

      <p className="text-xs text-emerald-900/40 mt-2">
        H = Hadir · T = Terlambat · A = Alpa · I = Izin · S = Sakit.
        Klik tombol untuk menandai status (klik tombol yang sama lagi
        untuk membatalkan tanda). Sel berlatar kuning = ada perubahan
        yang belum disimpan.
      </p>
    </div>
  );
}
