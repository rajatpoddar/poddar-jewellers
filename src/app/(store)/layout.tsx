import type { ReactNode } from 'react';
import { getShop } from '@/lib/shop';
import { getLatestRateSet } from '@/lib/rates.server';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { RateBanner } from '@/components/store/RateBanner';

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const shop = await getShop();
  const rateSet = await getLatestRateSet();
  const hoursOld = rateSet ? (Date.now() - new Date(rateSet.effectiveAt).getTime()) / (1000 * 60 * 60) : 999;

  return (
    <div className="min-h-screen bg-ground text-ink font-body flex flex-col antialiased">
      <RateBanner hoursOld={hoursOld} />
      <Header shop={shop} />
      <main className="flex-1">{children}</main>
      <Footer shop={shop} />
    </div>
  );
}
