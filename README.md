# SI Keasramaan — Sistem Informasi Absensi & Kedisiplinan Santri

Aplikasi full-stack untuk mengelola dua kebutuhan utama pesantren/asrama:

1. **Absensi** — sholat 5 waktu, sholat sunnah, dan kegiatan lain, dicatat per kelas per hari.
2. **Kedisiplinan** — dashboard rekap pelanggaran (ringan/sedang/berat) dan form input pelanggaran per santri.

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (Node.js) — `app/api/**/route.ts` |
| Database | SQLite via `better-sqlite3` — file lokal, tidak perlu setup server DB terpisah |

Karena Next.js API Routes berjalan di atas Node.js, kamu **tidak perlu server Express terpisah** — backend dan frontend berada dalam satu project yang sama, tapi tetap terpisah secara logis (folder `app/api` = backend, folder `app/(halaman)` + `components` = frontend).

## Struktur Folder

```
sim-asrama/
├── app/
│   ├── api/                     # Backend (Node.js API routes)
│   │   ├── kelas/               # CRUD data kelas
│   │   ├── siswa/                # CRUD data santri
│   │   ├── jenis-absensi/       # Master jenis absensi (sholat wajib/sunnah/kegiatan)
│   │   ├── absensi/              # Ambil & simpan absensi per kelas per tanggal
│   │   ├── kategori-pelanggaran/ # Master kategori pelanggaran
│   │   ├── pelanggaran/          # Catat & hapus pelanggaran
│   │   └── dashboard/            # Ringkasan statistik
│   ├── absensi/page.tsx          # Halaman grid absensi
│   ├── kedisiplinan/
│   │   ├── page.tsx              # Dashboard daftar pelanggaran
│   │   ├── input/page.tsx        # Form input pelanggaran
│   │   └── kategori/page.tsx     # Kelola kategori pelanggaran
│   ├── siswa/page.tsx            # CRUD data santri
│   ├── kelas/page.tsx            # CRUD data kelas
│   └── page.tsx                  # Dashboard utama
├── components/                   # Komponen UI reusable (Card, Button, Badge, dll)
├── lib/db.ts                     # Koneksi & skema database SQLite (auto-migrate + seed)
└── data/asrama.db                # File database (dibuat otomatis saat pertama dijalankan)
```

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Database SQLite (`data/asrama.db`) akan **otomatis dibuat** saat pertama kali dijalankan, lengkap dengan data awal (seed):
- 5 jenis sholat wajib (Subuh–Isya)
- 3 jenis sholat sunnah (Tahajud, Dhuha, Rawatib)
- 4 kegiatan contoh (Tahfidz, Kajian Kitab, Piket, Olahraga)
- 10 kategori pelanggaran contoh (ringan/sedang/berat)

Untuk build produksi:

```bash
npm run build
npm run start
```

## Alur Pemakaian

1. **Isi Data Master dulu**: buka menu **Data Kelas** → tambahkan kelas/kamar, lalu **Data Santri** → tambahkan santri dan pilih kelasnya.
2. **Absensi harian**: buka menu **Absensi**, pilih kelas & tanggal, lalu tandai status tiap santri (Hadir/Alpa/Izin/Sakit) untuk sholat wajib. Bisa pindah tab ke Sholat Sunnah atau Kegiatan Lain. Klik **Simpan Absensi**. Santri yang belum ditandai otomatis tersimpan sebagai Alpa (aman untuk direvisi kapan saja karena data bersifat "upsert" per tanggal).
3. **Kedisiplinan**:
   - Menu **Kategori Pelanggaran** untuk menambah/melihat daftar jenis pelanggaran beserta bobot poinnya (bisa disesuaikan dengan tata tertib asrama masing-masing).
   - Menu **Input Pelanggaran** untuk mencatat pelanggaran santri tertentu — pilih kelas, santri, kategori, tanggal, dan opsional keterangan/petugas.
   - Menu **Daftar Pelanggaran** menampilkan dashboard rekap (bisa difilter per tingkat, kelas, dan bulan).
4. **Dashboard utama** menampilkan ringkasan: jumlah santri aktif, persentase kehadiran sholat wajib hari ini, jumlah pelanggaran bulan berjalan, serta 5 santri dengan poin pelanggaran tertinggi.

## Poin Penting untuk Pengembangan Lanjutan

- **Autentikasi**: saat ini belum ada login/role (admin, musyrif, wali kelas). Untuk produksi, tambahkan NextAuth.js atau middleware sederhana berbasis session/JWT sebelum dipakai banyak pengguna.
- **Multi-user / concurrency**: SQLite cocok untuk single-server dengan trafik menengah. Jika nanti butuh diakses banyak asrama/cabang sekaligus dengan trafik tinggi, tinggal ganti `lib/db.ts` ke PostgreSQL (skema tabel sudah rapi dan mudah dipetakan, misalnya pakai Prisma).
- **Ekspor laporan**: kolom-kolom sudah terstruktur rapi sehingga mudah ditambahkan endpoint ekspor Excel/PDF (misalnya rekap absensi bulanan atau surat panggilan orang tua santri bermasalah).
- **Validasi tambahan**: saat ini validasi backend masih minimal (field wajib saja). Untuk produksi, tambahkan validasi lebih ketat (misalnya format NIS unik, range tanggal, dsb).
- **Skema database** ada di `lib/db.ts` — sudah pakai `FOREIGN KEY` dan constraint `CHECK` sehingga cukup aman dari data tidak konsisten.

## Palet Desain

Tema visual terinspirasi nuansa masjid/pesantren: hijau tua (`emerald-900`/`950`) sebagai warna utama, aksen emas (`gold-500`) untuk penekanan, dan latar krem hangat (`sand-50`) — dipadukan font display **Fraunces** (serif) untuk judul dan **Inter** untuk teks agar tetap mudah dibaca di tabel data yang padat.
