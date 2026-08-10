'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, StatCard, Badge, PageHeader, EmptyState } from '@/components/ui';

type DashboardData = {
  totalSiswa: number;
  totalKelas: number;
  absensiHariIni: { hadir: number; tidak_hadir: number; total: number };
  pelanggaranBulanIni: { tingkat: string; jumlah: number }[];
  siswaPelanggaranTerbanyak: { nama: string; kelas: string; total_poin: number; jumlah_kasus: number }[];
  pelanggaranTerbaru: { tanggal: string; nama_siswa: string; nama_kategori: string; tingkat: string; poin: number }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setData);
  }, []);

  const persenHadir = data && data.absensiHariIni.total > 0
    ? Math.round((data.absensiHariIni.hadir / data.absensiHariIni.total) * 100)
    : 0;

  const tingkatCount = (t: string) =>
    data?.pelanggaranBulanIni.find((p) => p.tingkat === t)?.jumlah || 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan kehadiran ibadah dan kedisiplinan santri hari ini"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Santri Aktif" value={data?.totalSiswa ?? '—'} />
        <StatCard label="Jumlah Kelas" value={data?.totalKelas ?? '—'} />
        <StatCard
          label="Kehadiran Sholat Wajib Hari Ini"
          value={data ? `${persenHadir}%` : '—'}
          sub={data ? `${data.absensiHariIni.hadir} hadir dari ${data.absensiHariIni.total} catatan` : undefined}
        />
        <StatCard
          label="Pelanggaran Bulan Ini"
          value={data ? tingkatCount('Ringan') + tingkatCount('Sedang') + tingkatCount('Berat') : '—'}
          tone="gold"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <p className="font-display text-lg text-emerald-950 mb-4">Pelanggaran per Tingkat (Bulan Ini)</p>
          <div className="space-y-3">
            {(['Ringan', 'Sedang', 'Berat'] as const).map((t) => {
              const val = tingkatCount(t);
              const max = Math.max(1, tingkatCount('Ringan'), tingkatCount('Sedang'), tingkatCount('Berat'));
              const colors: Record<string, string> = { Ringan: 'bg-emerald-600', Sedang: 'bg-gold-500', Berat: 'bg-red-500' };
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <Badge tingkat={t} />
                    <span className="text-emerald-900/70 font-medium">{val} kasus</span>
                  </div>
                  <div className="h-2 rounded-full bg-sand-100 overflow-hidden">
                    <div className={`h-full rounded-full ${colors[t]}`} style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/kedisiplinan/input" className="focus-ring mt-5 inline-block text-sm font-medium text-emerald-900 hover:text-gold-600">
            + Input pelanggaran baru →
          </Link>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <p className="font-display text-lg text-emerald-950 mb-4">Santri Poin Pelanggaran Tertinggi</p>
          {!data || data.siswaPelanggaranTerbanyak.length === 0 ? (
            <EmptyState title="Belum ada data" description="Belum ada pelanggaran tercatat bulan ini." />
          ) : (
            <div className="space-y-3">
              {data.siswaPelanggaranTerbanyak.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-emerald-950">{s.nama}</p>
                    <p className="text-xs text-emerald-900/50">{s.kelas || '-'} · {s.jumlah_kasus} kasus</p>
                  </div>
                  <span className="font-display text-gold-600">{s.total_poin} pt</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-1">
          <p className="font-display text-lg text-emerald-950 mb-4">Aktivitas Pelanggaran Terbaru</p>
          {!data || data.pelanggaranTerbaru.length === 0 ? (
            <EmptyState title="Belum ada aktivitas" />
          ) : (
            <div className="space-y-3">
              {data.pelanggaranTerbaru.map((p, i) => (
                <div key={i} className="text-sm border-b border-sand-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-emerald-950">{p.nama_siswa}</p>
                    <Badge tingkat={p.tingkat} />
                  </div>
                  <p className="text-xs text-emerald-900/50 mt-0.5">{p.nama_kategori} · {p.tanggal}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
