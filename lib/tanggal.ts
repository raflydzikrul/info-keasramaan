// Helper zona waktu — MASALAH: new Date().toISOString() selalu berbasis UTC,
// sedangkan Indonesia (WIB) lebih cepat 7 jam dari UTC. Ini bikin perhitungan
// "hari ini" bisa keliru mundur 1 hari kalau dipanggil dini hari (00:00-06:59 WIB).
// Solusinya: hitung tanggal secara eksplisit sesuai zona waktu yang relevan.

// Dipakai di BROWSER (client component) — pakai zona waktu perangkat pengguna
export function tanggalLokalHariIni(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function bulanLokalIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function tanggalAwalBulanLokal(): string {
  return `${bulanLokalIni()}-01`;
}

// Dipakai di SERVER (API routes) — server Vercel selalu berjalan di zona UTC
// apa pun region function-nya, jadi dipaksa hitung berdasarkan WIB secara eksplisit
export function tanggalServerHariIni(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

// Dipakai untuk query rentang "seluruh bulan X" dengan cara yang benar:
// (tanggal >= awal bulan) DAN (tanggal < awal bulan berikutnya).
// Jangan pernah hardcode "-31" sebagai akhir bulan — September, April, Juni,
// November cuma 30 hari, dan Februari 28/29 hari, sehingga "2026-09-31"
// bukan tanggal yang valid dan akan ditolak oleh database.
export function awalBulanBerikutnya(bulan: string): string {
  const [tahun, bulanAngka] = bulan.split('-').map(Number);
  const d = new Date(Date.UTC(tahun, bulanAngka, 1)); // bulanAngka (1-12) di posisi bulan berikutnya (0-based +1 = bulan ini +1)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
