import crypto from 'crypto';
import { cookies } from 'next/headers';

export const KD_COOKIE_NAME = 'kd_session';
const SESSION_HOURS = 8;

function getSecret(): Buffer {
  const password = process.env.KEDISIPLINAN_PASSWORD;
  if (!password) {
    throw new Error('KEDISIPLINAN_PASSWORD belum diatur di environment variable');
  }
  return crypto.createHash('sha256').update(password).digest();
}

export function checkPassword(input: string): boolean {
  const expected = process.env.KEDISIPLINAN_PASSWORD;
  if (!expected) return false;
  // Bandingkan pakai timingSafeEqual supaya tidak bocor lewat timing attack
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  } catch {
    return false;
  }
  return Date.now() < Number(payload);
}

// Dipakai di dalam Route Handler (app/api/**) untuk mengecek sesi kedisiplinan
export function isKedisiplinanAuthed(): boolean {
  const token = cookies().get(KD_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
