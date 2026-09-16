import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { getNavCategories } from './categories.server';

vi.mock('@/lib/db', () => ({
  db: {
    category: {
      findMany: vi.fn(),
    },
  },
}));

describe('getNavCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a 2-level category tree with top-level and sub-categories', async () => {
    const mockDbCategories = [
      { id: 'cat-1', name: 'Gold Jewellery', slug: 'gold', parentId: null, sortOrder: 1 },
      { id: 'cat-2', name: 'Silver Ornaments', slug: 'silver', parentId: null, sortOrder: 2 },
      { id: 'sub-1', name: 'Necklaces', slug: 'necklaces', parentId: 'cat-1', sortOrder: 1 },
      { id: 'sub-2', name: 'Rings', slug: 'rings', parentId: 'cat-1', sortOrder: 2 },
      { id: 'sub-3', name: 'Payal', slug: 'payal', parentId: 'cat-2', sortOrder: 1 },
    ];

    vi.mocked(db.category.findMany).mockResolvedValue(mockDbCategories as any);

    const result = await getNavCategories('shop-123');

    expect(db.category.findMany).toHaveBeenCalledWith({
      where: { shopId: 'shop-123' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true, sortOrder: true },
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Gold Jewellery');
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0].name).toBe('Necklaces');
    expect(result[0].children![1].name).toBe('Rings');

    expect(result[1].name).toBe('Silver Ornaments');
    expect(result[1].children).toHaveLength(1);
    expect(result[1].children![0].name).toBe('Payal');
  });

  it('handles empty category list gracefully', async () => {
    vi.mocked(db.category.findMany).mockResolvedValue([]);
    const result = await getNavCategories('shop-123');
    expect(result).toEqual([]);
  });
});
