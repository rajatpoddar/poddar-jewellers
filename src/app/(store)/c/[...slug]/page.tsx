import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { ProductCard } from '@/components/store/ProductCard';
import { parseSlugArray } from '../slug';

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ sort?: string }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const leafSlug = parseSlugArray(slug);

  const shop = await getShop();
  const category = await db.category.findFirst({
    where: { shopId: shop.id, slug: leafSlug },
  });

  if (!category) {
    notFound();
  }

  const orderBy = sort === 'price_asc'
    ? { cachedPriceMinPaise: 'asc' as const }
    : sort === 'price_desc'
    ? { cachedPriceMinPaise: 'desc' as const }
    : { createdAt: 'desc' as const };

  const products = await db.product.findMany({
    where: {
      shopId: shop.id,
      categoryId: category.id,
      status: 'LIVE',
    },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
    orderBy,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink font-bold">{category.name}</h1>
          {(category as { description?: string | null }).description && (
            <p className="text-ink-muted text-sm mt-1">{(category as { description?: string | null }).description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-ink-muted">
          <label htmlFor="sort-select" className="font-medium">Sort by:</label>
          <select
            id="sort-select"
            defaultValue={sort || 'newest'}
            className="bg-surface border border-line rounded-field px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-line-strong"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-16 text-center text-ink-muted bg-surface rounded-card border border-line">
          <p className="font-medium text-base text-ink">Is category mein abhi koi product nahi hai.</p>
          <p className="text-xs text-ink-faint mt-1">Jaldi hi naye designs add kiye jayenge.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
