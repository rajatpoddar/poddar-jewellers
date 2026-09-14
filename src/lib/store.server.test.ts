import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    category: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/shop', () => ({
  getShop: vi.fn(),
}));

import { formatStorefrontPrice, getHomepageData } from './store.server';
import { getShop } from '@/lib/shop';
import { db } from '@/lib/db';

describe('formatStorefrontPrice', () => {
  it('formats amount using formatINR', () => {
    const formatted = formatStorefrontPrice(31800000); // 3,18,000 rupees in paise
    expect(formatted).toBe('₹3,18,000');
  });
});

describe('getHomepageData', () => {
  it('queries shop, categories, and featured products for current shop', async () => {
    const mockShop = { id: 'shop_abc123' };
    const mockCategories = [{ id: 'cat_1', name: 'Necklaces' }];
    const mockProducts = [{ id: 'prod_1', name: 'Gold Chain' }];

    vi.mocked(getShop).mockResolvedValue(mockShop as any);
    vi.mocked(db.category.findMany).mockResolvedValue(mockCategories as any);
    vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any);

    const result = await getHomepageData();

    expect(result.shop).toEqual(mockShop);
    expect(result.categories).toEqual(mockCategories);
    expect(result.featuredProducts).toEqual(mockProducts);

    expect(db.category.findMany).toHaveBeenCalledWith({
      where: { shopId: 'shop_abc123' },
      orderBy: { sortOrder: 'asc' },
      take: 8,
    });

    expect(db.product.findMany).toHaveBeenCalledWith({
      where: { shopId: 'shop_abc123', status: 'LIVE', featured: true },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        weights: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
      take: 6,
    });
  });
});
