'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/kedisiplinan', { method: 'DELETE' });
    router.refresh();
  };

  return (
    <button
      onClick={logout}
      className="focus-ring text-xs font-medium text-emerald-900/50 hover:text-red-600 flex items-center gap-1"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Kunci halaman ini
    </button>
  );
}
