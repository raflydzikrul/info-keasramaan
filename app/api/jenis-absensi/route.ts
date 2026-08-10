import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabase.from('jenis_absensi').select('*').order('kategori').order('urutan');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.nama || !body.kategori) {
    return NextResponse.json({ error: 'Nama dan kategori wajib diisi' }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from('jenis_absensi')
    .select('urutan')
    .order('urutan', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('jenis_absensi')
    .insert({ nama: body.nama, kategori: body.kategori, urutan: (maxRow?.urutan || 0) + 1 })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
