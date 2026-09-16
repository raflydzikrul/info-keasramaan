import { useEffect, useRef } from 'react';

/**
 * Memanggil ulang `callback` setiap kali tab/halaman kembali aktif
 * (kembali dilihat setelah pindah tab, minimize, atau pindah menu lalu balik lagi).
 *
 * Masalah yang diselesaikan: Next.js App Router kadang menyimpan halaman yang
 * sudah dikunjungi di memori (client-side router cache) supaya navigasi terasa
 * instan. Efeknya, kalau kamu mengedit data di halaman lain lalu kembali ke
 * halaman ini lewat menu (bukan reload penuh), data yang tampil bisa jadi
 * data lama karena `useEffect` pengambilan data tidak otomatis jalan lagi.
 * Hook ini memastikan data selalu dimuat ulang begitu halaman terlihat lagi.
 */
export function useRefetchOnFocus(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') callbackRef.current();
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);
}
