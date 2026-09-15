import type { ReactNode } from 'react';
import { getShop } from '@/lib/shop';
import { getLatestRateSet } from '@/lib/rates.server';
import { getCurrentCustomer } from '@/lib/auth/customer-session';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { RateBanner } from '@/components/store/RateBanner';

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const shop = await getShop();
  const rateSet = await getLatestRateSet();
  const customer = await getCurrentCustomer();
  const hoursOld = rateSet ? (Date.now() - new Date(rateSet.effectiveAt).getTime()) / (1000 * 60 * 60) : 999;

  return (
    <div className="min-h-screen bg-ground text-ink font-body flex flex-col antialiased">
      <RateBanner hoursOld={hoursOld} />
      <Header shop={shop} customer={customer ? { name: customer.name } : null} />
      <main className="flex-1">{children}</main>
      <Footer shop={shop} />
    </div>
  );
}
