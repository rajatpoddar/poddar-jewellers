import { notFound } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { getActivePromotions } from '@/lib/promotions.server';
import { ProductCard } from '@/components/store/ProductCard';
import { parseSlugArray } from '../slug';

function getCategoryImage(slug: string): string | undefined {
  const lower = slug.toLowerCase();
  if (lower.includes('choker')) return '/images/cat-chokers.png';
  if (lower.includes('necklace') || lower.includes('haar')) return '/images/cat-necklaces.png';
  if (lower.includes('earring') || lower.includes('jhumka') || lower.includes('top') || lower.includes('bali')) return '/images/cat-earrings.png';
  if (lower.includes('bangle') || lower.includes('kangan') || lower.includes('kada')) return '/images/cat-bangles.png';
  if (lower.includes('bridal') || lower.includes('set')) return '/images/cat-bridal.png';
  if (lower.includes('ring') || lower.includes('angoothi')) return '/images/cat-rings.png';
  if (lower.includes('payal') || lower.includes('anklet')) return '/images/cat-payal.png';
  if (lower.includes('mangalsutra') || lower.includes('tanmaniya')) return '/images/cat-mangalsutra.png';
  if (lower.includes('pendant') || lower.includes('locket')) return '/images/cat-pendants.png';
  if (lower.includes('chain')) return '/images/cat-chains.png';
  if (lower.includes('coin')) return '/images/cat-coins.png';
  return undefined;
}

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

  const activePromotions = await getActivePromotions(shop.id);

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
    include: { images: { orderBy: { sortOrder: 'asc' } }, category: true },
    orderBy,
  });

  const categoryImg = getCategoryImage(category.slug);

  function resolvePromoForProduct(productId: string) {
    if (activePromotions.length === 0) return null;

    // 1. PRODUCT scope
    const prodMatches = activePromotions.filter(
      (p) => p.scope === 'PRODUCT' && p.productPromotions.some((pp) => pp.productId === productId)
    );
    if (prodMatches.length > 0) {
      return prodMatches.reduce((max, p) => (p.makingDiscountPercentBp > max.makingDiscountPercentBp ? p : max));
    }

    // 2. CATEGORY scope
    const catMatches = activePromotions.filter((p) => p.scope === 'CATEGORY' && p.categoryId === category.id);
    if (catMatches.length > 0) {
      return catMatches.reduce((max, p) => (p.makingDiscountPercentBp > max.makingDiscountPercentBp ? p : max));
    }

    // 3. SHOP_WIDE scope
    const shopMatches = activePromotions.filter((p) => p.scope === 'SHOP_WIDE');
    if (shopMatches.length > 0) {
      return shopMatches.reduce((max, p) => (p.makingDiscountPercentBp > max.makingDiscountPercentBp ? p : max));
    }

    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {categoryImg ? (
        <div className="relative h-48 sm:h-64 rounded-card overflow-hidden border border-line bg-surface-sunk">
          <Image
            src={categoryImg}
            alt={category.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ground/90 via-ground/60 to-transparent flex items-center p-6 sm:p-10">
            <div className="max-w-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-brand">Exclusive Collection</span>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink">{category.name}</h1>
              <p className="text-xs sm:text-sm text-ink-muted">
                100% BIS Hallmarked purity ke saath handcrafted {category.name} collection.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink font-bold">{category.name}</h1>
            {(category as { description?: string | null }).description && (
              <p className="text-ink-muted text-sm mt-1">{(category as { description?: string | null }).description}</p>
            )}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="py-16 text-center text-ink-muted bg-surface rounded-card border border-line">
          <p className="font-medium text-base text-ink">Is category mein abhi koi product nahi hai.</p>
          <p className="text-xs text-ink-faint mt-1">Jaldi hi naye designs add kiye jayenge.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const promo = resolvePromoForProduct(product.id);
            return <ProductCard key={product.id} product={product} promotion={promo} />;
          })}
        </div>
      )}
    </div>
  );
}
