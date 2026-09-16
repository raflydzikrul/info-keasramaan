import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isKedisiplinanAuthed()) {
    return NextResponse.json({ error: 'Tidak memiliki akses. Masukkan password kedisiplinan terlebih dahulu.' }, { status: 401 });
  }

  const { error } = await supabase.from('pelanggaran').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
