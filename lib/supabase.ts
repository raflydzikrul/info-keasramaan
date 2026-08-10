import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dipakai HANYA di backend (API routes), memakai service_role key yang
// melewati Row Level Security. JANGAN pernah import file ini di komponen
// client ('use client') atau expose service_role key ke browser.
//
// Client dibuat "lazy" (saat pertama kali dipakai dalam sebuah request),
// bukan saat file di-import — supaya proses build Next.js tidak gagal
// hanya karena environment variable belum diisi saat build berjalan.

let cachedClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local (atau Environment Variables di Vercel)'
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cachedClient;
}

// Proxy supaya pemakaian tetap sama seperti sebelumnya: `supabase.from(...)`
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    return (client as any)[prop];
  }
});

export default supabase;
