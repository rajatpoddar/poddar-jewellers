import { getShop } from '@/lib/shop';
import { getShopPromotions } from '@/lib/promotions.server';
import { db } from '@/lib/db';
import { PromotionsClient, SerializedPromotion } from './PromotionsClient';

export default async function AdminPromotionsPage() {
  const shop = await getShop();

  const [promotionsRaw, categoriesRaw, productsRaw] = await Promise.all([
    getShopPromotions(shop.id),
    db.category.findMany({
      where: { shopId: shop.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.product.findMany({
      where: { shopId: shop.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const promotions: SerializedPromotion[] = promotionsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    headline: p.headline,
    badgeText: p.badgeText,
    makingDiscountPercentBp: p.makingDiscountPercentBp,
    scope: p.scope,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    productCount: p.productPromotions.length,
    productNames: p.productPromotions.map((pp) => pp.product.name),
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    isActive: p.isActive,
  }));

  return (
    <PromotionsClient
      promotions={promotions}
      categories={categoriesRaw}
      products={productsRaw}
    />
  );
}
