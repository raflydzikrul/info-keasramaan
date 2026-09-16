// File ini dipertahankan agar import lama di API routes tetap berjalan.
// Implementasinya sekarang memakai lib/area-auth.ts yang generik.

import { isAreaAuthed, cookieName } from '@/lib/area-auth';

export const KD_COOKIE_NAME = cookieName('kedisiplinan');

export function isKedisiplinanAuthed(): boolean {
  return isAreaAuthed('kedisiplinan');
}
