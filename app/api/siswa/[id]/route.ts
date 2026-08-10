import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { error } = await supabase
    .from('siswa')
    .update({
      nis: body.nis || null,
      nama: body.nama,
      kelas_id: body.kelas_id || null,
      jk: body.jk || 'L',
      status: body.status || 'Aktif'
    })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('siswa').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
