import { Suspense } from 'react';
import { getAllLiveProducts } from '@/lib/store.server';
import { getShop } from '@/lib/shop';
import { db } from '@/lib/db';
import { SearchClient } from './SearchClient';

export async function generateMetadata() {
  const shop = await getShop();
  return {
    title: `Search Catalogue | ${shop.name}`,
    description: `Search gold, diamond, and silver jewellery designs at ${shop.name}.`,
  };
}

export default async function SearchPage() {
  const shop = await getShop();
  const [products, categories] = await Promise.all([
    getAllLiveProducts(),
    db.category.findMany({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
          <div className="h-10 w-64 bg-surface-sunk animate-pulse rounded mx-auto" />
          <div className="h-14 bg-surface-sunk animate-pulse rounded-card" />
        </div>
      }
    >
      <SearchClient initialProducts={products} categories={categories} shopName={shop.name} />
    </Suspense>
  );
}
