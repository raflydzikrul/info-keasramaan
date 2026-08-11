import { isKedisiplinanAuthed } from '@/lib/kedisiplinan-auth';
import PasswordGate from '@/components/PasswordGate';
import LogoutButton from '@/components/LogoutButton';

export default function KedisiplinanLayout({ children }: { children: React.ReactNode }) {
  const authed = isKedisiplinanAuthed();

  if (!authed) {
    return <PasswordGate />;
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
