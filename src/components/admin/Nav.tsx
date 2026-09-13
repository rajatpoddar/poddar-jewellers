import { logout } from '@/app/admin/login/actions';
import { Button } from '@/components/ui/Button';
import { LogoutIcon } from '@/components/ui/icons';
import { NavLinks } from './NavLinks';

/**
 * Two rows on purpose: who you are and whose shop this is on top, where you
 * are underneath. The link list is the only interactive part that needs the
 * current path, so it is the only client component here.
 */
export function Nav({ shopName, adminName }: { shopName: string; adminName: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex items-center gap-4 py-3.5">
          <span className="truncate font-display text-xl text-ink">{shopName}</span>
          <span className="ml-auto hidden text-sm text-ink-faint sm:inline">{adminName}</span>
          <form action={logout}>
            <Button type="submit" intent="quiet" className="px-3">
              <LogoutIcon />
              Logout
            </Button>
          </form>
        </div>
        <NavLinks />
      </div>
    </header>
  );
}
