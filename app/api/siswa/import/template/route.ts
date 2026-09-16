import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: kelasList } = await supabase.from('kelas').select('nama').order('nama');

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('Data Santri');
  sheet.columns = [
    { header: 'NIS', key: 'nis', width: 12 },
    { header: 'Nama', key: 'nama', width: 25 },
    { header: 'Kelas', key: 'kelas', width: 15 },
    { header: 'JK', key: 'jk', width: 6 }
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({ nis: '2026001', nama: 'Ahmad Fauzi', kelas: kelasList?.[0]?.nama || 'X IPA 1', jk: 'L' });
  sheet.addRow({ nis: '2026002', nama: 'Siti Aminah', kelas: kelasList?.[0]?.nama || 'X IPA 1', jk: 'P' });

  if (kelasList && kelasList.length > 0) {
    const sheetKelas = workbook.addWorksheet('Daftar Kelas (referensi)');
    sheetKelas.columns = [{ header: 'Nama Kelas Terdaftar', key: 'nama', width: 30 }];
    sheetKelas.getRow(1).font = { bold: true };
    kelasList.forEach((k: any) => sheetKelas.addRow({ nama: k.nama }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-santri.xlsx"'
    }
  });
}
