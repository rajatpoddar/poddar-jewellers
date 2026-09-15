import { describe, it, expect } from 'vitest';
import { filterProducts, SearchProduct } from './search';

const mockProducts: SearchProduct[] = [
  {
    id: 'p1',
    name: '22K Gold Bridal Choker Set',
    slug: '22k-gold-bridal-choker-set',
    categoryId: 'c-chokers',
    cachedPriceMinPaise: 15000000,
    cachedPriceMaxPaise: 20000000,
    createdAt: new Date('2026-01-01'),
    category: { id: 'c-chokers', name: 'Chokers', slug: 'chokers' },
  } as unknown as SearchProduct,
  {
    id: 'p2',
    name: '18K Diamond Solitaire Ring',
    slug: '18k-diamond-solitaire-ring',
    categoryId: 'c-rings',
    cachedPriceMinPaise: 4500000,
    cachedPriceMaxPaise: 4500000,
    createdAt: new Date('2026-02-01'),
    category: { id: 'c-rings', name: 'Rings', slug: 'rings' },
  } as unknown as SearchProduct,
  {
    id: 'p3',
    name: 'Antique Gold Jhumka Earrings',
    slug: 'antique-gold-jhumka-earrings',
    categoryId: 'c-earrings',
    cachedPriceMinPaise: 8000000,
    cachedPriceMaxPaise: 9500000,
    createdAt: new Date('2026-03-01'),
    category: { id: 'c-earrings', name: 'Earrings', slug: 'earrings' },
  } as unknown as SearchProduct,
];

describe('product search filtering logic', () => {
  it('returns all products when search query is empty', () => {
    const results = filterProducts(mockProducts, { query: '' });
    expect(results).toHaveLength(3);
  });

  it('filters by product name query case-insensitively', () => {
    const results = filterProducts(mockProducts, { query: 'jhumka' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p3');
  });

  it('filters by category name query', () => {
    const results = filterProducts(mockProducts, { query: 'chokers' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p1');
  });

  it('filters by categoryId', () => {
    const results = filterProducts(mockProducts, { query: '', categoryId: 'c-rings' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p2');
  });

  it('sorts by price ascending', () => {
    const results = filterProducts(mockProducts, { query: '', sort: 'price-asc' });
    expect(results.map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
  });

  it('sorts by price descending', () => {
    const results = filterProducts(mockProducts, { query: '', sort: 'price-desc' });
    expect(results.map((p) => p.id)).toEqual(['p1', 'p3', 'p2']);
  });
});
