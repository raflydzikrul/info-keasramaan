import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: kelasList } = await supabase.from('kelas').select('nama').order('nama');

  const contoh = [
    { NIS: '2026001', Nama: 'Ahmad Fauzi', Kelas: kelasList?.[0]?.nama || 'X IPA 1', JK: 'L' },
    { NIS: '2026002', Nama: 'Siti Aminah', Kelas: kelasList?.[0]?.nama || 'X IPA 1', JK: 'P' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(contoh);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 6 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Santri');

  if (kelasList && kelasList.length > 0) {
    const sheetKelas = XLSX.utils.json_to_sheet(kelasList.map((k: any) => ({ 'Nama Kelas Terdaftar': k.nama })));
    XLSX.utils.book_append_sheet(workbook, sheetKelas, 'Daftar Kelas (referensi)');
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-santri.xlsx"'
    }
  });
}
