import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    promotion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';
import {
  getShopPromotions,
  getActivePromotions,
  resolveProductPromotion,
  createPromotion,
  togglePromotionActive,
  deletePromotion,
  CreatePromotionInput,
} from './promotions.server';

describe('promotions.server data layer', () => {
  const shopId = 'shop_123';
  const now = new Date('2026-09-16T12:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getShopPromotions', () => {
    it('fetches all promotions for shop sorted by createdAt desc', async () => {
      const mockPromos = [
        { id: 'p1', name: 'Dhanteras', shopId },
        { id: 'p2', name: 'Diwali', shopId },
      ];
      vi.mocked(db.promotion.findMany).mockResolvedValue(mockPromos as any);

      const result = await getShopPromotions(shopId);

      expect(result).toEqual(mockPromos);
      expect(db.promotion.findMany).toHaveBeenCalledWith({
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
    });
  });

  describe('getActivePromotions', () => {
    it('fetches active promotions within date range for shop', async () => {
      const mockPromos = [{ id: 'p1', name: 'Active Promo', shopId }];
      vi.mocked(db.promotion.findMany).mockResolvedValue(mockPromos as any);

      const result = await getActivePromotions(shopId, now);

      expect(result).toEqual(mockPromos);
      expect(db.promotion.findMany).toHaveBeenCalledWith({
        where: {
          shopId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          productPromotions: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createPromotion', () => {
    it('creates a shop-wide promotion', async () => {
      const input: CreatePromotionInput = {
        name: 'Festive Swarna Utsav',
        headline: '15% OFF Making Charges',
        badgeText: 'Festive Offer',
        makingDiscountPercentBp: 1500,
        scope: 'SHOP_WIDE',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-10-01'),
        isActive: true,
      };

      const createdPromo = { id: 'promo_1', shopId, ...input };
      vi.mocked(db.promotion.create).mockResolvedValue(createdPromo as any);

      const result = await createPromotion(shopId, input);

      expect(result).toEqual(createdPromo);
      expect(db.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId,
          name: 'Festive Swarna Utsav',
          headline: '15% OFF Making Charges',
          badgeText: 'Festive Offer',
          makingDiscountPercentBp: 1500,
          scope: 'SHOP_WIDE',
          categoryId: null,
          isActive: true,
        }),
        include: expect.any(Object),
      });
    });

    it('creates a product-scoped promotion with productPromotions relations', async () => {
      const input: CreatePromotionInput = {
        name: 'Necklace Exclusive',
        headline: '25% OFF Making',
        badgeText: 'Special',
        makingDiscountPercentBp: 2500,
        scope: 'PRODUCT',
        productIds: ['prod_1', 'prod_2'],
        startDate: '2026-09-01',
        endDate: '2026-10-01',
      };

      const createdPromo = { id: 'promo_2', shopId, ...input };
      vi.mocked(db.promotion.create).mockResolvedValue(createdPromo as any);

      await createPromotion(shopId, input);

      expect(db.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId,
          scope: 'PRODUCT',
          productPromotions: {
            create: [
              { productId: 'prod_1' },
              { productId: 'prod_2' },
            ],
          },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('togglePromotionActive', () => {
    it('updates active status of a promotion', async () => {
      vi.mocked(db.promotion.update).mockResolvedValue({ id: 'p1', isActive: false } as any);

      await togglePromotionActive('p1', false);

      expect(db.promotion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isActive: false },
      });
    });
  });

  describe('deletePromotion', () => {
    it('deletes a promotion by id', async () => {
      vi.mocked(db.promotion.delete).mockResolvedValue({ id: 'p1' } as any);

      await deletePromotion('p1');

      expect(db.promotion.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });
  });

  describe('resolveProductPromotion', () => {
    it('returns null when no active promotions exist', async () => {
      vi.mocked(db.promotion.findMany).mockResolvedValue([]);

      const discount = await resolveProductPromotion(shopId, 'cat_1', 'prod_1', now);

      expect(discount).toBeNull();
      expect(db.promotion.findMany).toHaveBeenCalledWith({
        where: {
          shopId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        include: expect.any(Object),
      });
    });

    it('returns shop-wide promotion discount when no category/product match exists', async () => {
      const activePromos = [
        {
          id: 'p_shop',
          scope: 'SHOP_WIDE',
          makingDiscountPercentBp: 1000,
          productPromotions: [],
        },
      ];
      vi.mocked(db.promotion.findMany).mockResolvedValue(activePromos as any);

      const discount = await resolveProductPromotion(shopId, 'cat_1', 'prod_1', now);

      expect(discount).toBe(1000);
    });

    it('prioritizes PRODUCT scope > CATEGORY scope > SHOP_WIDE scope', async () => {
      const activePromos = [
        {
          id: 'p_shop',
          scope: 'SHOP_WIDE',
          makingDiscountPercentBp: 1000,
          productPromotions: [],
        },
        {
          id: 'p_cat',
          scope: 'CATEGORY',
          categoryId: 'cat_necklaces',
          makingDiscountPercentBp: 2000,
          productPromotions: [],
        },
        {
          id: 'p_prod',
          scope: 'PRODUCT',
          makingDiscountPercentBp: 3000,
          productPromotions: [{ productId: 'prod_gold_chain' }],
        },
      ];
      vi.mocked(db.promotion.findMany).mockResolvedValue(activePromos as any);

      // Case 1: Product matches PRODUCT promo (3000)
      const prodDiscount = await resolveProductPromotion(
        shopId,
        'cat_necklaces',
        'prod_gold_chain',
        now
      );
      expect(prodDiscount).toBe(3000);

      // Case 2: Product does NOT match PRODUCT promo, falls back to CATEGORY promo (2000)
      const catDiscount = await resolveProductPromotion(
        shopId,
        'cat_necklaces',
        'prod_other',
        now
      );
      expect(catDiscount).toBe(2000);

      // Case 3: Category does NOT match, falls back to SHOP_WIDE promo (1000)
      const shopDiscount = await resolveProductPromotion(
        shopId,
        'cat_bangles',
        'prod_bangle_1',
        now
      );
      expect(shopDiscount).toBe(1000);
    });

    it('picks the highest discount if multiple active promotions exist at the same scope level', async () => {
      const activePromos = [
        {
          id: 'cat_promo_1',
          scope: 'CATEGORY',
          categoryId: 'cat_rings',
          makingDiscountPercentBp: 1500,
          productPromotions: [],
        },
        {
          id: 'cat_promo_2',
          scope: 'CATEGORY',
          categoryId: 'cat_rings',
          makingDiscountPercentBp: 2500,
          productPromotions: [],
        },
      ];
      vi.mocked(db.promotion.findMany).mockResolvedValue(activePromos as any);

      const discount = await resolveProductPromotion(shopId, 'cat_rings', 'prod_ring_1', now);

      expect(discount).toBe(2500);
    });
  });
});
