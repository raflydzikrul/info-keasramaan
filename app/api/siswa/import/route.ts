import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Gagal = { baris: number; alasan: string };

function normalisasiJk(val: any): 'L' | 'P' {
  const s = String(val ?? '').trim().toUpperCase();
  return s.startsWith('P') ? 'P' : 'L';
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File Excel tidak ditemukan pada permintaan' }, { status: 400 });

  let rows: Record<string, any>[];
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } catch {
    return NextResponse.json({ error: 'File tidak bisa dibaca. Pastikan formatnya .xlsx sesuai template.' }, { status: 400 });
  }

  const { data: kelasRows } = await supabase.from('kelas').select('id, nama');
  const kelasMap = new Map((kelasRows || []).map((k: any) => [k.nama.trim().toLowerCase(), k.id]));

  const { data: siswaExisting } = await supabase.from('siswa').select('nis').not('nis', 'is', null);
  const nisExisting = new Set((siswaExisting || []).map((r: any) => r.nis).filter(Boolean));

  const gagal: Gagal[] = [];
  const kelasTidakDitemukan = new Set<string>();
  const toInsert: { nis: string | null; nama: string; kelas_id: number | null; jk: 'L' | 'P'; status: string }[] = [];
  const nisInFile = new Set<string>();

  let totalBaris = 0;
  rows.forEach((row, idx) => {
    const baris = idx + 2;
    const nis = String(row.NIS ?? '').trim();
    const nama = String(row.Nama ?? '').trim();
    const kelasNama = String(row.Kelas ?? '').trim();
    const jkRaw = row.JK ?? row['Jenis Kelamin'] ?? row['Jenis Kelamin (L/P)'] ?? '';

    if (!nis && !nama && !kelasNama && !jkRaw) return;
    totalBaris++;

    if (!nama) { gagal.push({ baris, alasan: 'Kolom Nama wajib diisi' }); return; }
    if (nis && nisExisting.has(nis)) { gagal.push({ baris, alasan: `NIS "${nis}" sudah terdaftar di database` }); return; }
    if (nis && nisInFile.has(nis)) { gagal.push({ baris, alasan: `NIS "${nis}" duplikat di dalam file` }); return; }

    let kelasId: number | null = null;
    if (kelasNama) {
      const found = kelasMap.get(kelasNama.toLowerCase());
      if (!found) kelasTidakDitemukan.add(kelasNama);
      else kelasId = found as number;
    }

    if (nis) nisInFile.add(nis);
    toInsert.push({ nis: nis || null, nama, kelas_id: kelasId, jk: normalisasiJk(jkRaw), status: 'Aktif' });
  });

  if (toInsert.length > 0) {
    const { error } = await supabase.from('siswa').insert(toInsert);
    if (error) return NextResponse.json({ error: `Gagal menyimpan ke database: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    total_baris: totalBaris,
    berhasil: toInsert.length,
    gagal,
    kelas_tidak_ditemukan: Array.from(kelasTidakDitemukan)
  });
}
