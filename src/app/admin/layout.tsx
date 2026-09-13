import type { ReactNode } from 'react';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { Nav } from '@/components/admin/Nav';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  // The login page lives under /admin but renders outside this chrome.
  if (!admin) return <>{children}</>;

  const shop = await getShop();

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav shopName={shop.name} adminName={admin.name} />
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
