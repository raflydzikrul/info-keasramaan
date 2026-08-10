'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuGroups } from './menu-config';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup menu otomatis saat pindah halaman & kunci scroll body saat menu terbuka
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-emerald-950 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gold-500 text-emerald-950 grid place-items-center font-display font-bold shrink-0">A</div>
          <span className="font-display truncate">SI Keasramaan</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="focus-ring p-2 rounded-md hover:bg-emerald-900 shrink-0"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100vh-56px)] overflow-y-auto bg-emerald-950 border-t border-white/10 shadow-lg">
          <nav className="px-3 py-4 space-y-5">
            {menuGroups.map((group) => (
              <div key={group.group}>
                <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/40">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-3 py-2.5 rounded-lg text-sm ${
                          active ? 'bg-emerald-800 text-white font-medium' : 'text-emerald-100/80 hover:bg-emerald-900'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
