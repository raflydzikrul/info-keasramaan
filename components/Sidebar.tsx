'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuGroups } from './menu-config';

const icons: Record<string, JSX.Element> = {
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  check: <path d="M20 6L9 17l-5-5" />,
  flag: <path d="M4 3v18M4 4h11l-2 4 2 4H4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  user: <path d="M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" />,
  building: <path d="M3 21h18M6 21V5a1 1 0 011-1h6a1 1 0 011 1v16M14 9h4a1 1 0 011 1v11M9 7h1M9 11h1M9 15h1" />
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 h-screen sticky top-0 bg-emerald-950 text-sand-100">
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500 text-emerald-950 grid place-items-center font-display font-bold text-lg">
            A
          </div>
          <div>
            <p className="font-display text-lg leading-tight text-white">SI Keasramaan</p>
            <p className="text-xs text-emerald-100/60 tracking-wide">Absensi & Kedisiplinan</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/40">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`focus-ring flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-emerald-800 text-white shadow-card'
                        : 'text-emerald-100/70 hover:bg-emerald-900 hover:text-white'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {icons[item.icon]}
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-white/10 text-xs text-emerald-100/50">
        Data tersimpan lokal di server (SQLite)
      </div>
    </aside>
  );
}
