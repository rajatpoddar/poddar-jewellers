import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { Nav } from '@/components/admin/Nav';

/**
 * Every admin screen renders inside this. The login page sits outside the
 * (panel) route group, so it does not.
 *
 * This redirect — not the proxy — is the authoritative gate. The proxy is an
 * optimistic check that saves a round trip; were it ever bypassed, no admin
 * data would render because this layout runs on the server for every page
 * beneath it.
 */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');

  const shop = await getShop();

  return (
    <div className="min-h-screen bg-ground">
      <Nav shopName={shop.name} adminName={admin.name} />
      {/* pb-24 keeps the last Save button clear of a phone's home indicator. */}
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">{children}</main>
    </div>
  );
}
