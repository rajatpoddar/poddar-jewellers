import { Product, Category, MetalType, ProductImage } from '@prisma/client';

export type SearchProduct = Product & {
  images: ProductImage[];
  category?: Category | null;
  metalType?: MetalType | null;
};

export interface SearchOptions {
  query?: string;
  categoryId?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'newest';
}

export function filterProducts(products: SearchProduct[], options: SearchOptions = {}): SearchProduct[] {
  const { query = '', categoryId, sort = 'featured' } = options;
  const q = query.trim().toLowerCase();

  let filtered = products.filter((p) => {
    if (categoryId && categoryId !== 'all' && p.categoryId !== categoryId) return false;
    if (!q) return true;

    const nameMatch = p.name.toLowerCase().includes(q);
    const catMatch = p.category?.name.toLowerCase().includes(q) ?? false;
    const metalMatch = p.metalType?.label.toLowerCase().includes(q) ?? false;
    const slugMatch = p.slug.toLowerCase().includes(q);

    return nameMatch || catMatch || metalMatch || slugMatch;
  });

  if (sort === 'price-asc') {
    filtered = [...filtered].sort(
      (a, b) => (a.cachedPriceMinPaise ?? 0) - (b.cachedPriceMinPaise ?? 0)
    );
  } else if (sort === 'price-desc') {
    filtered = [...filtered].sort(
      (a, b) => (b.cachedPriceMinPaise ?? 0) - (a.cachedPriceMinPaise ?? 0)
    );
  } else if (sort === 'newest') {
    filtered = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return filtered;
}
