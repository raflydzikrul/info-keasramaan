'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';

export default function PasswordGate() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/kedisiplinan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Password salah');
        return;
      }
      router.refresh(); // muat ulang layout server-side supaya cookie baru terbaca
    } catch {
      setError('Tidak bisa terhubung ke server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <Card className="p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-sand-100 grid place-items-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-900/60">
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        </div>
        <p className="font-display text-lg text-emerald-950 mb-1">Halaman Terkunci</p>
        <p className="text-sm text-emerald-900/60 mb-5">
          Bagian Kedisiplinan hanya bisa diakses dengan password khusus.
        </p>
        <form onSubmit={submit} className="space-y-3 text-left">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukan Password.."
            autoFocus
            required
          />
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? 'Memeriksa...' : 'Masuk'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
