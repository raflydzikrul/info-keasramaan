export const menuGroups = [
  {
    group: 'Ringkasan',
    items: [{ href: '/', label: 'Dashboard', icon: 'grid' }]
  },
  {
    group: 'Absensi',
    items: [
      { href: '/absensi', label: 'Absensi Sholat & Kegiatan', icon: 'check' },
      { href: '/absensi/rekap', label: 'Rekap Absensi', icon: 'list' },
      { href: '/absensi/jenis', label: 'Jenis Absensi', icon: 'list' }
    ]
  },
  {
    group: 'Kedisiplinan',
    items: [
      { href: '/kedisiplinan', label: 'Daftar Pelanggaran', icon: 'flag' },
      { href: '/kedisiplinan/input', label: 'Input Pelanggaran', icon: 'plus' },
      { href: '/kedisiplinan/kategori', label: 'Kategori Pelanggaran', icon: 'list' }
    ]
  },
  {
    group: 'Data Master',
    items: [
      { href: '/siswa', label: 'Data Santri', icon: 'user' },
      { href: '/kelas', label: 'Data Kelas', icon: 'building' }
    ]
  }
];
