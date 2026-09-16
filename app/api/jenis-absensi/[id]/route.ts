import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.nama || !body.kategori) {
    return NextResponse.json({ error: 'Nama dan kategori wajib diisi' }, { status: 400 });
  }
  const { error } = await supabase
    .from('jenis_absensi')
    .update({ nama: body.nama, kategori: body.kategori })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('jenis_absensi').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
