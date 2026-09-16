import { isAreaAuthed } from '@/lib/area-auth';
import PasswordGate from '@/components/PasswordGate';
import LogoutButton from '@/components/LogoutButton';

export default function KedisiplinanLayout({ children }: { children: React.ReactNode }) {
  if (!isAreaAuthed('kedisiplinan')) {
    return <PasswordGate area="kedisiplinan" label="Kedisiplinan" />;
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <LogoutButton area="kedisiplinan" />
      </div>
      {children}
    </div>
  );
}
