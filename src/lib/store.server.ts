import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { formatINR } from '@/lib/money';

export function formatStorefrontPrice(paise: number): string {
  return formatINR(paise);
}

export async function getHomepageData() {
  const shop = await getShop();
  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: { sortOrder: 'asc' },
    take: 8,
  });

  const featuredProducts = await db.product.findMany({
    where: { shopId: shop.id, status: 'LIVE', featured: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      weights: { orderBy: { sortOrder: 'asc' } },
      category: true,
    },
    take: 6,
  });

  return { shop, categories, featuredProducts };
}
