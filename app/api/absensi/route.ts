import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/absensi?kelas_id=1&tanggal=2026-08-09
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const kelasId = searchParams.get('kelas_id');
  const tanggal = searchParams.get('tanggal');

  if (!kelasId || !tanggal) {
    return NextResponse.json(
      {
        error:
          'kelas_id dan tanggal wajib diisi'
      },
      { status: 400 }
    );
  }

  const [
    {
      data: siswa,
      error: e1
    },
    {
      data: jenis,
      error: e2
    }
  ] = await Promise.all([
    supabase
      .from('siswa')
      .select(
        'id, nis, nama'
      )
      .eq('kelas_id', kelasId)
      .eq('status', 'Aktif')
      .order('nama'),

    supabase
      .from('jenis_absensi')
      .select('*')
      .order('urutan')
  ]);

  if (e1) {
    return NextResponse.json(
      { error: e1.message },
      { status: 500 }
    );
  }

  if (e2) {
    return NextResponse.json(
      { error: e2.message },
      { status: 500 }
    );
  }

  const siswaIds = (
    siswa || []
  ).map(
    (s: any) => s.id
  );

  let existing: any[] = [];

  if (siswaIds.length > 0) {
    const {
      data,
      error
    } = await supabase
      .from('absensi')
      .select(
        'id, siswa_id, jenis_id, status, keterangan'
      )
      .eq('tanggal', tanggal)
      .in(
        'siswa_id',
        siswaIds
      )
      /*
       * Data terbaru didahulukan.
       * Jika terdapat data duplikat,
       * data terbaru yang digunakan.
       */
      .order('id', {
        ascending: false
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    existing = data || [];
  }

  return NextResponse.json({
    siswa,
    jenis,
    existing
  });
}


// POST
//
// Body:
// {
//   tanggal: "2026-09-16",
//   entries: [
//     {
//       siswa_id: 1,
//       jenis_id: 2,
//       status: "Hadir"
//     }
//   ]
// }
//
// PENTING:
// Hanya entry yang dikirim yang akan disimpan.
// Entry kosong TIDAK dibuat menjadi Alpa/Hadir.
export async function POST(req: Request) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error:
          'Format data JSON tidak valid'
      },
      { status: 400 }
    );
  }

  const {
    tanggal,
    entries
  } = body;

  if (
    !tanggal ||
    !Array.isArray(entries)
  ) {
    return NextResponse.json(
      {
        error:
          'Data tidak lengkap'
      },
      { status: 400 }
    );
  }

  /*
   * Jangan menerima request kosong.
   */
  if (entries.length === 0) {
    return NextResponse.json(
      {
        error:
          'Tidak ada data absensi yang dikirim'
      },
      { status: 400 }
    );
  }

  const STATUS_VALID = [
    'Hadir',
    'Terlambat',
    'Alpa',
    'Izin',
    'Sakit'
  ] as const;

  const rows: {
    siswa_id: number;
    jenis_id: number;
    tanggal: string;
    status: string;
    keterangan: string | null;
  }[] = [];

  for (const r of entries) {
    /*
     * Validasi siswa_id.
     */
    if (
      r?.siswa_id === undefined ||
      r?.siswa_id === null ||
      r?.siswa_id === ''
    ) {
      return NextResponse.json(
        {
          error:
            'Ada baris absensi tanpa siswa'
        },
        { status: 400 }
      );
    }

    /*
     * Validasi jenis_id.
     */
    if (
      r?.jenis_id === undefined ||
      r?.jenis_id === null ||
      r?.jenis_id === ''
    ) {
      return NextResponse.json(
        {
          error:
            'Ada baris absensi tanpa jenis absensi'
        },
        { status: 400 }
      );
    }

    /*
     * JANGAN menggunakan:
     *
     * const status = r.status || 'Hadir';
     *
     * karena status kosong tidak boleh
     * otomatis berubah menjadi Hadir.
     *
     * Status wajib benar-benar dikirim.
     */
    if (
      typeof r.status !== 'string' ||
      r.status.trim() === ''
    ) {
      return NextResponse.json(
        {
          error:
            'Ada baris absensi tanpa status. Status harus dipilih terlebih dahulu.'
        },
        { status: 400 }
      );
    }

    const status =
      r.status.trim();

    /*
     * Pastikan status hanya salah satu
     * dari pilihan yang tersedia.
     */
    if (
      !STATUS_VALID.includes(
        status as any
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Status "${status}" tidak dikenali`
        },
        { status: 400 }
      );
    }

    rows.push({
      siswa_id:
        Number(r.siswa_id),

      jenis_id:
        Number(r.jenis_id),

      tanggal,

      status,

      keterangan:
        typeof r.keterangan ===
        'string' &&
        r.keterangan.trim() !== ''
          ? r.keterangan.trim()
          : null
    });
  }

  /*
   * Pastikan setelah validasi masih ada
   * data yang benar-benar bisa disimpan.
   */
  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          'Tidak ada data absensi valid untuk disimpan'
      },
      { status: 400 }
    );
  }

  /*
   * Simpan hanya rows yang diterima.
   *
   * Sel yang tidak ada di rows:
   * - tidak dibuat
   * - tidak diubah
   * - tidak menjadi Alpa
   * - tidak menjadi Hadir
   */
  const {
    data,
    error
  } = await supabase
    .from('absensi')
    .upsert(
      rows,
      {
        onConflict:
          'siswa_id,jenis_id,tanggal'
      }
    )
    .select('id');

  if (error) {
    return NextResponse.json(
      {
        error: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    jumlah:
      data?.length ?? 0
  });
}

