import { PromotionScope } from '@prisma/client';
import { db } from '@/lib/db';

export interface CreatePromotionInput {
  name: string;
  headline: string;
  badgeText: string;
  makingDiscountPercentBp: number;
  scope?: PromotionScope;
  categoryId?: string | null;
  productIds?: string[];
  startDate: Date | string;
  endDate: Date | string;
  isActive?: boolean;
}

export async function getShopPromotions(shopId: string) {
  return db.promotion.findMany({
    where: { shopId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      productPromotions: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActivePromotions(shopId: string, now: Date = new Date()) {
  return db.promotion.findMany({
    where: {
      shopId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      productPromotions: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function resolveProductPromotion(
  shopId: string,
  categoryId?: string | null,
  productId?: string | null,
  now: Date = new Date()
): Promise<number | null> {
  const activePromotions = await db.promotion.findMany({
    where: {
      shopId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      productPromotions: {
        select: {
          productId: true,
        },
      },
    },
  });

  if (activePromotions.length === 0) {
    return null;
  }

  // Hierarchy: PRODUCT > CATEGORY > SHOP_WIDE
  // 1. Check PRODUCT scope matches
  if (productId) {
    const productMatches = activePromotions.filter(
      (p) =>
        p.scope === 'PRODUCT' &&
        p.productPromotions.some((pp) => pp.productId === productId)
    );
    if (productMatches.length > 0) {
      return Math.max(...productMatches.map((p) => p.makingDiscountPercentBp));
    }
  }

  // 2. Check CATEGORY scope matches
  if (categoryId) {
    const categoryMatches = activePromotions.filter(
      (p) => p.scope === 'CATEGORY' && p.categoryId === categoryId
    );
    if (categoryMatches.length > 0) {
      return Math.max(...categoryMatches.map((p) => p.makingDiscountPercentBp));
    }
  }

  // 3. Check SHOP_WIDE scope matches
  const shopWideMatches = activePromotions.filter((p) => p.scope === 'SHOP_WIDE');
  if (shopWideMatches.length > 0) {
    return Math.max(...shopWideMatches.map((p) => p.makingDiscountPercentBp));
  }

  return null;
}

export async function createPromotion(shopId: string, input: CreatePromotionInput) {
  const scope = input.scope ?? 'SHOP_WIDE';
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const isActive = input.isActive ?? true;

  return db.promotion.create({
    data: {
      shopId,
      name: input.name,
      headline: input.headline,
      badgeText: input.badgeText,
      makingDiscountPercentBp: input.makingDiscountPercentBp,
      scope,
      categoryId: scope === 'CATEGORY' ? input.categoryId : null,
      startDate,
      endDate,
      isActive,
      ...(scope === 'PRODUCT' && input.productIds && input.productIds.length > 0
        ? {
            productPromotions: {
              create: input.productIds.map((productId) => ({
                productId,
              })),
            },
          }
        : {}),
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      productPromotions: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });
}

export async function togglePromotionActive(id: string, isActive: boolean, shopId?: string) {
  if (shopId) {
    return db.promotion.updateMany({
      where: { id, shopId },
      data: { isActive },
    });
  }
  return db.promotion.update({
    where: { id },
    data: { isActive },
  });
}

export async function deletePromotion(id: string, shopId?: string) {
  if (shopId) {
    return db.promotion.deleteMany({
      where: { id, shopId },
    });
  }
  return db.promotion.delete({
    where: { id },
  });
}
