// Helper pemanggilan API dengan penanganan error yang konsisten.
//
// Masalah yang diselesaikan: sebelumnya banyak halaman memanggil
// `fetch(...).then(r => r.json())` tanpa memeriksa `r.ok`. Akibatnya kalau
// server membalas error (500, 401, dsb), halaman tetap menganggapnya sukses
// dan menampilkan "data kosong" atau pesan "Tersimpan" palsu — padahal
// sebenarnya gagal. Helper ini memastikan error selalu terdeteksi.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handle(res: Response) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // body bukan JSON (misal halaman error HTML dari server)
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(
        data?.error || 'Sesi kamu sudah berakhir. Muat ulang halaman lalu masukkan password lagi.',
        401
      );
    }
    throw new ApiError(data?.error || `Terjadi kesalahan pada server (kode ${res.status})`, res.status);
  }
  return data;
}

function bungkusError(e: any): never {
  if (e instanceof ApiError) throw e;
  throw new ApiError('Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.', 0);
}

export async function apiGet<T = any>(url: string): Promise<T> {
  try {
    // cache: 'no-store' memaksa browser SELALU ambil data baru dari server,
    // tidak peduli header cache apa pun yang sempat tersimpan dari response
    // sebelumnya (termasuk yang ke-cache sebelum perbaikan header di server).
    const res = await fetch(url, { cache: 'no-store' });
    return await handle(res);
  } catch (e) {
    bungkusError(e);
  }
}

export async function apiSend<T = any>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: any
): Promise<T> {
  try {
    const res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    return await handle(res);
  } catch (e) {
    bungkusError(e);
  }
}

// Ambil pesan error yang layak ditampilkan ke pengguna
export function pesanError(e: any): string {
  if (e instanceof ApiError) return e.message;
  return 'Terjadi kesalahan tak terduga. Coba muat ulang halaman.';
}
