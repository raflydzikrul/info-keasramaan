import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }
  const { data, error } = await supabase.from('kategori_pelanggaran').select('*').order('tingkat').order('nama');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }
  const body = await req.json();
  if (!body.nama || !body.tingkat) {
    return NextResponse.json({ error: 'Nama dan tingkat wajib diisi' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('kategori_pelanggaran')
    .insert({ nama: body.nama, tingkat: body.tingkat, poin: body.poin || 5 })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
