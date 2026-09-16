import crypto from 'crypto';
import { cookies } from 'next/headers';

// Gerbang password per-area. Setiap area punya password sendiri, jadi
// petugas piket tidak otomatis bisa membuka bagian kedisiplinan, dan sebaliknya.

export type Area = 'kedisiplinan' | 'piket';

type KonfigArea = { envPassword: string; cookie: string; label: string };

export const AREA: Record<Area, KonfigArea> = {
  kedisiplinan: {
    envPassword: 'KEDISIPLINAN_PASSWORD',
    cookie: 'kd_session',
    label: 'Kedisiplinan'
  },
  piket: {
    envPassword: 'JURNAL_PIKET_PASSWORD',
    cookie: 'piket_session',
    label: 'Jurnal Piket Asrama'
  }
};

const SESSION_HOURS = 8;

export function isAreaValid(v: string): v is Area {
  return v === 'kedisiplinan' || v === 'piket';
}

function ambilPassword(area: Area): string | undefined {
  return process.env[AREA[area].envPassword];
}

function getSecret(area: Area): Buffer {
  const password = ambilPassword(area);
  if (!password) {
    throw new Error(`${AREA[area].envPassword} belum diatur di environment variable`);
  }
  // Secret dibuat per-area supaya token satu area tidak berlaku di area lain
  return crypto.createHash('sha256').update(`${area}::${password}`).digest();
}

export function areaSiapDipakai(area: Area): boolean {
  return Boolean(ambilPassword(area));
}

export function checkPassword(area: Area, input: string): boolean {
  const expected = ambilPassword(area);
  if (!expected) return false;
  // timingSafeEqual: cegah kebocoran informasi lewat perbedaan waktu respons
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(area: Area): string {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const sig = crypto.createHmac('sha256', getSecret(area)).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(area: Area, token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const expected = crypto.createHmac('sha256', getSecret(area)).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  } catch {
    return false;
  }
  return Date.now() < Number(payload);
}

export function cookieName(area: Area): string {
  return AREA[area].cookie;
}

export function sessionMaxAge(): number {
  return SESSION_HOURS * 60 * 60;
}

// Dipakai di Route Handler / Server Component untuk mengecek sesi sebuah area
export function isAreaAuthed(area: Area): boolean {
  const token = cookies().get(AREA[area].cookie)?.value;
  return verifySessionToken(area, token);
}
