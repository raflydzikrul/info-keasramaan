import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'SI Keasramaan — Absensi & Kedisiplinan',
  description: 'Sistem informasi keasramaan: absensi ibadah dan kedisiplinan santri'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body text-emerald-950 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <MobileNav />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
