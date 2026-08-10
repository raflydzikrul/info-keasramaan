import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { error } = await supabase
    .from('kelas')
    .update({ nama: body.nama, wali_kelas: body.wali_kelas || null })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('kelas').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
