import { isAreaAuthed } from '@/lib/area-auth';
import PasswordGate from '@/components/PasswordGate';
import LogoutButton from '@/components/LogoutButton';

export default function PiketLayout({ children }: { children: React.ReactNode }) {
  if (!isAreaAuthed('piket')) {
    return (
      <PasswordGate
        area="piket"
        label="Jurnal Piket Asrama"
        keterangan="Jurnal Piket Asrama hanya bisa diakses oleh petugas dengan password khusus."
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <LogoutButton area="piket" />
      </div>
      {children}
    </div>
  );
}
