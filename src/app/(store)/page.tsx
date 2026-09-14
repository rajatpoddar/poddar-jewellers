import { getHomepageData } from '@/lib/store.server';
import { getLatestRateSet } from '@/lib/rates.server';
import { ProductCard } from '@/components/store/ProductCard';
import { CategoryTile } from '@/components/store/CategoryTile';
import { formatINR } from '@/lib/money';

export default async function HomePage() {
  const { shop, categories, featuredProducts } = await getHomepageData();
  const rateSet = await getLatestRateSet();

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="bg-surface-sunk border-b border-line py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="font-display text-4xl md:text-5xl text-ink font-bold">
            {shop.heroHeading || shop.name}
          </h1>
          <p className="text-lg text-ink-muted max-w-xl mx-auto">
            {shop.heroSubheading || 'Explore our exclusive collection with live daily gold and silver rates.'}
          </p>
        </div>
      </section>

      {/* Daily Rates Strip */}
      {rateSet && rateSet.lines.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="bg-surface border border-line rounded-card p-4 flex flex-wrap items-center justify-around gap-4 text-center">
            {rateSet.lines.map((line) => (
              <div key={line.metalType.id} className="space-y-1">
                <span className="text-xs text-ink-muted uppercase tracking-wider block font-medium">
                  {line.metalType.label}
                </span>
                <span className="font-display text-xl font-bold text-ink numeric">
                  {formatINR(line.pricePerGramPaise)} / g
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-6">
          <h2 className="font-display text-2xl text-ink font-bold">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <CategoryTile key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-ink font-bold">Featured Collection</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
