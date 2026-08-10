export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-sand-200 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label, value, sub, tone = 'emerald'
}: { label: string; value: string | number; sub?: string; tone?: 'emerald' | 'gold' }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900/50">{label}</p>
      <p className={`font-display text-3xl mt-2 ${tone === 'gold' ? 'text-gold-600' : 'text-emerald-900'}`}>{value}</p>
      {sub && <p className="text-xs text-emerald-900/50 mt-1">{sub}</p>}
    </Card>
  );
}

export function Badge({ tingkat }: { tingkat: 'Ringan' | 'Sedang' | 'Berat' | string }) {
  const map: Record<string, string> = {
    Ringan: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Sedang: 'bg-gold-100 text-gold-600 border-gold-100',
    Berat: 'bg-red-50 text-red-700 border-red-100'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${map[tingkat] || 'bg-sand-100 text-emerald-900 border-sand-200'}`}>
      {tingkat}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Hadir: 'bg-emerald-100 text-emerald-800',
    Terlambat: 'bg-orange-50 text-orange-700',
    Alpa: 'bg-red-50 text-red-700',
    Izin: 'bg-gold-100 text-gold-600',
    Sakit: 'bg-sand-200 text-emerald-900'
  };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${map[status] || 'bg-sand-100'}`}>{status}</span>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-emerald-950">{title}</h1>
        {description && <p className="text-sm text-emerald-900/60 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children, onClick, variant = 'primary', type = 'button', disabled, className = ''
}: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  const base = 'focus-ring inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-emerald-900 text-white hover:bg-emerald-800',
    secondary: 'bg-sand-100 text-emerald-900 border border-sand-200 hover:bg-sand-200',
    ghost: 'text-emerald-900 hover:bg-sand-100',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100'
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm placeholder:text-emerald-900/30 ${props.className || ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm ${props.className || ''}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`focus-ring w-full px-3.5 py-2.5 rounded-lg border border-sand-200 bg-white text-sm placeholder:text-emerald-900/30 ${props.className || ''}`}
    />
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-sand-100 grid place-items-center mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-900/40">
          <path d="M9 12h6M9 16h6M9 8h6M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16l-3-2-2 2-2-2-2 2-2-2-3 2z" />
        </svg>
      </div>
      <p className="font-medium text-emerald-950">{title}</p>
      {description && <p className="text-sm text-emerald-900/50 mt-1">{description}</p>}
    </div>
  );
}
