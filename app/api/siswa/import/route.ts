import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Gagal = { baris: number; alasan: string };

function normalisasiJk(val: any): 'L' | 'P' {
  const s = String(val ?? '').trim().toUpperCase();
  return s.startsWith('P') ? 'P' : 'L';
}

function teksSel(cell: ExcelJS.Cell): string {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text).trim(); // rich text
  if (typeof v === 'object' && 'result' in (v as any)) return String((v as any).result ?? '').trim(); // formula
  return String(v).trim();
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File Excel tidak ditemukan pada permintaan' }, { status: 400 });

  const workbook = new ExcelJS.Workbook();
  try {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer as any);
  } catch {
    return NextResponse.json({ error: 'File tidak bisa dibaca. Pastikan formatnya .xlsx sesuai template.' }, { status: 400 });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: 'Sheet data tidak ditemukan di file Excel' }, { status: 400 });
  }

  // Petakan nama kolom header (baris 1) -> nomor kolom, supaya urutan kolom
  // di file Excel yang tidak persis sama tetap terbaca dengan benar
  const headerRow = sheet.getRow(1);
  const kolom: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const nama = String(cell.value ?? '').trim().toLowerCase();
    if (nama) kolom[nama] = colNumber;
  });
  const colNis = kolom['nis'];
  const colNama = kolom['nama'];
  const colKelas = kolom['kelas'];
  const colJk = kolom['jk'] || kolom['jenis kelamin'] || kolom['jenis kelamin (l/p)'];

  const { data: kelasRows } = await supabase.from('kelas').select('id, nama');
  const kelasMap = new Map((kelasRows || []).map((k: any) => [k.nama.trim().toLowerCase(), k.id]));

  const { data: siswaExisting } = await supabase.from('siswa').select('nis').not('nis', 'is', null);
  const nisExisting = new Set((siswaExisting || []).map((r: any) => r.nis).filter(Boolean));

  const gagal: Gagal[] = [];
  const kelasTidakDitemukan = new Set<string>();
  const toInsert: { nis: string | null; nama: string; kelas_id: number | null; jk: 'L' | 'P'; status: string }[] = [];
  const nisInFile = new Set<string>();

  let totalBaris = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // lewati header

    const nis = colNis ? teksSel(row.getCell(colNis)) : '';
    const nama = colNama ? teksSel(row.getCell(colNama)) : '';
    const kelasNama = colKelas ? teksSel(row.getCell(colKelas)) : '';
    const jkRaw = colJk ? teksSel(row.getCell(colJk)) : '';

    if (!nis && !nama && !kelasNama && !jkRaw) return; // baris kosong, lewati diam-diam
    totalBaris++;

    if (!nama) { gagal.push({ baris: rowNumber, alasan: 'Kolom Nama wajib diisi' }); return; }
    if (nis && nisExisting.has(nis)) { gagal.push({ baris: rowNumber, alasan: `NIS "${nis}" sudah terdaftar di database` }); return; }
    if (nis && nisInFile.has(nis)) { gagal.push({ baris: rowNumber, alasan: `NIS "${nis}" duplikat di dalam file` }); return; }

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
