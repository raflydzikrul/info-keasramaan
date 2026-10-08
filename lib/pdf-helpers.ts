import PDFDocument from 'pdfkit';

// Palet warna senada dengan tema aplikasi (hijau tua & emas)
export const WARNA = {
  hijauTua: '#0F3D3A',
  hijauMuda: '#E4EFEC',
  emas: '#B08D3F',
  emasMuda: '#F6EFDA',
  teksUtama: '#1a1a1a',
  teksSamar: '#6b7280',
  garis: '#d8d2c2',
  zebra: '#FAF8F3',
  merah: '#b91c1c'
};

const MARGIN = 40;
const LEBAR_HALAMAN = 595.28; // A4 pt
const LEBAR_KONTEN = LEBAR_HALAMAN - MARGIN * 2;
const BATAS_BAWAH = 760;

type KolomTabel = {
  label: string;
  lebar: number;
  align?: 'left' | 'right' | 'center';
};

/**
 * Menggambar kop laporan: pita warna di atas, judul besar, subjudul,
 * lalu daftar info (kelas/periode/dsb) dalam bentuk label-nilai rapi.
 */
export function gambarKop(
  doc: PDFKit.PDFDocument,
  judul: string,
  subjudul: string | null,
  info: { label: string; nilai: string }[]
): number {
  // Pita warna di bagian paling atas halaman
  doc.rect(0, 0, LEBAR_HALAMAN, 8).fill(WARNA.hijauTua);

  let y = 32;

  doc
    .fillColor(WARNA.hijauTua)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(judul, MARGIN, y, {
      width: LEBAR_KONTEN,
      align: 'center'
    });

  y = doc.y + 2;

  if (subjudul) {
    doc
      .fillColor(WARNA.emas)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(subjudul.toUpperCase(), MARGIN, y, {
        width: LEBAR_KONTEN,
        align: 'center',
        characterSpacing: 0.5
      });

    y = doc.y;
  }

  y += 14;

  // Garis emas tipis sebagai pemisah dekoratif
  doc
    .moveTo(MARGIN + LEBAR_KONTEN / 2 - 30, y)
    .lineTo(MARGIN + LEBAR_KONTEN / 2 + 30, y)
    .lineWidth(1.5)
    .strokeColor(WARNA.emas)
    .stroke();

  y += 18;

  // Kotak info (kelas, periode, dicetak, dll) dengan latar lembut
  const tinggiInfo = info.length * 15 + 16;

  doc
    .roundedRect(MARGIN, y, LEBAR_KONTEN, tinggiInfo, 4)
    .fill(WARNA.hijauMuda);

  let yInfo = y + 10;

  info.forEach((item) => {
    doc
      .fillColor(WARNA.teksSamar)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(item.label.toUpperCase(), MARGIN + 14, yInfo, {
        width: 110,
        characterSpacing: 0.3
      });

    doc
      .fillColor(WARNA.teksUtama)
      .font('Helvetica')
      .fontSize(9.5)
      .text(item.nilai, MARGIN + 130, yInfo, {
        width: LEBAR_KONTEN - 150
      });

    yInfo += 15;
  });

  return y + tinggiInfo + 20;
}

/**
 * Menggambar tabel dengan header berwarna, baris belang-seling (zebra),
 * dan border rapi.
 *
 * Perbaikan:
 * - Tinggi baris otomatis mengikuti isi teks.
 * - Teks panjang otomatis turun ke baris berikutnya.
 * - Tidak ada teks kategori yang terpotong.
 * - Otomatis pindah halaman jika baris tidak cukup ruang.
 */
export function gambarTabel(
  doc: PDFKit.PDFDocument,
  startY: number,
  kolom: KolomTabel[],
  baris: string[][],
  opsi?: { pesanKosong?: string }
): number {
  let y = startY;

  const lebarTotal = kolom.reduce((a, k) => a + k.lebar, 0);

  // Padding horizontal dan vertikal
  const PADDING_X = 6;
  const PADDING_Y = 6;

  // Font tabel
  const FONT_SIZE = 8.5;
  const LINE_GAP = 1;

  /**
   * Mendapatkan tinggi teks berdasarkan lebar kolom.
   *
   * heightOfString() dari PDFKit digunakan agar teks panjang
   * otomatis menghitung berapa baris yang diperlukan.
   */
  const tinggiTeks = (
    teks: string,
    lebar: number,
    fontSize = FONT_SIZE
  ) => {
    doc.font('Helvetica').fontSize(fontSize);

    return doc.heightOfString(teks || '', {
      width: Math.max(20, lebar),
      lineGap: LINE_GAP
    });
  };

  /**
   * Tinggi minimum baris.
   */
  const TINGGI_MIN_BARIS = 24;

  /**
   * Menghitung tinggi sebuah baris berdasarkan seluruh isi kolom.
   */
  const hitungTinggiBaris = (nilaiBaris: string[]) => {
    let tinggi = TINGGI_MIN_BARIS;

    nilaiBaris.forEach((val, i) => {
      const kolomSekarang = kolom[i];

      if (!kolomSekarang) return;

      const tinggiCell = tinggiTeks(
        String(val ?? ''),
        kolomSekarang.lebar - PADDING_X * 2
      );

      tinggi = Math.max(
        tinggi,
        tinggiCell + PADDING_Y * 2
      );
    });

    return tinggi;
  };

  /**
   * Header tabel.
   */
  const TINGGI_HEADER = 24;

  const gambarHeaderTabel = () => {
    doc
      .rect(MARGIN, y, lebarTotal, TINGGI_HEADER)
      .fill(WARNA.hijauTua);

    let x = MARGIN;

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#FFFFFF');

    kolom.forEach((k) => {
      doc.text(
        k.label,
        x + PADDING_X,
        y + 7,
        {
          width: Math.max(20, k.lebar - PADDING_X * 2),
          align: k.align || 'left',
          lineBreak: false
        }
      );

      x += k.lebar;
    });

    y += TINGGI_HEADER;
  };

  /**
   * Memastikan baris masih cukup ruang.
   */
  const pastikanMuat = (tinggiButuh: number) => {
    if (y + tinggiButuh > BATAS_BAWAH) {
      doc.addPage();

      y = MARGIN;

      gambarHeaderTabel();
    }
  };

  // Gambar header pertama
  gambarHeaderTabel();

  // Jika tidak ada data
  if (baris.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(WARNA.teksSamar)
      .text(
        opsi?.pesanKosong || 'Tidak ada data.',
        MARGIN,
        y + 10,
        {
          width: lebarTotal,
          align: 'center'
        }
      );

    y += 36;

    return y;
  }

  // Gambar seluruh baris
  baris.forEach((nilaiBaris, idx) => {
    const tinggiBaris = hitungTinggiBaris(nilaiBaris);

    pastikanMuat(tinggiBaris);

    // Zebra row
    if (idx % 2 === 1) {
      doc
        .rect(
          MARGIN,
          y,
          lebarTotal,
          tinggiBaris
        )
        .fill(WARNA.zebra);
    }

    let x = MARGIN;

    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE)
      .fillColor(WARNA.teksUtama);

    nilaiBaris.forEach((val, i) => {
      const kolomSekarang = kolom[i];

      if (!kolomSekarang) return;

      const teks = String(val ?? '');

      const tinggiCell = tinggiTeks(
        teks,
        kolomSekarang.lebar - PADDING_X * 2
      );

      // Posisi teks vertikal.
      // Untuk teks satu baris tetap terlihat rapi di tengah.
      // Untuk teks panjang, mulai dari atas agar turun ke bawah.
      const offsetY =
        tinggiCell < tinggiBaris - PADDING_Y * 2
          ? y + (tinggiBaris - tinggiCell) / 2
          : y + PADDING_Y;

      doc.text(
        teks,
        x + PADDING_X,
        offsetY,
        {
          width: Math.max(
            20,
            kolomSekarang.lebar - PADDING_X * 2
          ),
          align: kolomSekarang.align || 'left',
          lineGap: LINE_GAP
        }
      );

      x += kolomSekarang.lebar;
    });

    // Garis bawah antar baris
    doc
      .moveTo(
        MARGIN,
        y + tinggiBaris
      )
      .lineTo(
        MARGIN + lebarTotal,
        y + tinggiBaris
      )
      .lineWidth(0.5)
      .strokeColor(WARNA.garis)
      .stroke();

    y += tinggiBaris;
  });

  return y;
}

/** Kotak ringkasan di bawah tabel (contoh: total kasus, total poin, dst) */
export function gambarRingkasan(
  doc: PDFKit.PDFDocument,
  startY: number,
  butir: { label: string; nilai: string }[]
): number {
  let y = startY + 12;

  const lebarTotal = LEBAR_KONTEN;
  const tinggi = 34;

  doc
    .roundedRect(
      MARGIN,
      y,
      lebarTotal,
      tinggi,
      4
    )
    .fill(WARNA.emasMuda);

  const lebarButir =
    lebarTotal / butir.length;

  butir.forEach((b, i) => {
    const x =
      MARGIN + i * lebarButir;

    doc
      .fillColor(WARNA.teksSamar)
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        b.label.toUpperCase(),
        x + 12,
        y + 7,
        {
          width: lebarButir - 20,
          characterSpacing: 0.3
        }
      );

    doc
      .fillColor(WARNA.hijauTua)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(
        b.nilai,
        x + 12,
        y + 17,
        {
          width: lebarButir - 20
        }
      );
  });

  return y + tinggi;
}

/** Judul bagian (contoh: "Detail Catatan yang Perlu Tindak Lanjut") */
export function gambarJudulBagian(
  doc: PDFKit.PDFDocument,
  startY: number,
  teks: string
): number {
  let y = startY;

  if (y > BATAS_BAWAH - 40) {
    doc.addPage();
    y = MARGIN;
  }

  y += 10;

  doc
    .rect(MARGIN, y, 4, 16)
    .fill(WARNA.emas);

  doc
    .fillColor(WARNA.hijauTua)
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .text(
      teks,
      MARGIN + 12,
      y + 1
    );

  y += 24;

  return y;
}

/**
 * Menambahkan footer (nomor halaman + waktu cetak) di SETIAP halaman yang
 * sudah dibuat sejauh ini. Dipanggil sekali di akhir, SEBELUM doc.end().
 */
export function tambahFooterSemuaHalaman(
  doc: PDFKit.PDFDocument,
  labelAplikasi = 'SI Keasramaan'
) {
  const range = doc.bufferedPageRange();

  const waktuCetak =
    new Date().toLocaleString('id-ID');

  for (
    let i = range.start;
    i < range.start + range.count;
    i++
  ) {
    doc.switchToPage(i);

    // PENTING: pdfkit otomatis membuat halaman BARU kalau kita menulis teks
    // tepat di/lewat batas margin bawah.
    // Nonaktifkan sementara margin bawah supaya footer bisa ditulis di
    // halaman yang sama tanpa memicu halaman kosong tambahan.
    const marginBawahAsli =
      doc.page.margins.bottom;

    doc.page.margins.bottom = 0;

    const y = 802;

    doc
      .moveTo(MARGIN, y)
      .lineTo(
        LEBAR_HALAMAN - MARGIN,
        y
      )
      .lineWidth(0.5)
      .strokeColor(WARNA.garis)
      .stroke();

    doc
      .fillColor(WARNA.teksSamar)
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        `${labelAplikasi} · dicetak ${waktuCetak}`,
        MARGIN,
        y + 6,
        {
          width: 300,
          lineBreak: false
        }
      );

    doc.text(
      `Halaman ${i - range.start + 1} dari ${range.count}`,
      LEBAR_HALAMAN - MARGIN - 150,
      y + 6,
      {
        width: 150,
        align: 'right',
        lineBreak: false
      }
    );

    doc.page.margins.bottom =
      marginBawahAsli;
  }
}

export {
  MARGIN,
  LEBAR_KONTEN,
  BATAS_BAWAH
};