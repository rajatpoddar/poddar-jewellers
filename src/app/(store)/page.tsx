import Link from 'next/link';
import Image from 'next/image';
import { getHomepageData } from '@/lib/store.server';
import { getActiveHeroSlides } from '@/lib/hero-slides.server';
import { getActivePromotions } from '@/lib/promotions.server';
import { ProductCard } from '@/components/store/ProductCard';
import { CategoryTile } from '@/components/store/CategoryTile';
import { HeroCarousel } from '@/components/store/HeroCarousel';
import { ButtonLink } from '@/components/ui/Button';

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

export default async function HomePage() {
  const { shop, categories, featuredProducts } = await getHomepageData();
  const heroSlides = await getActiveHeroSlides(shop.id);
  const activePromotions = await getActivePromotions(shop.id);

  const shopObj = shop as typeof shop & { whatsappNumber?: string; whatsapp?: string; heroHeading?: string; heroSubheading?: string };
  const whatsappNumber = shopObj.whatsappNumber || shopObj.whatsapp || '';

  function resolvePromoForProduct(productId: string, categoryId: string) {
    if (activePromotions.length === 0) return null;

    const prodMatches = activePromotions.filter(
      (p) => p.scope === 'PRODUCT' && p.productPromotions.some((pp) => pp.productId === productId)
    );
    if (prodMatches.length > 0) {
      return prodMatches.reduce((max, p) => (p.makingDiscountPercentBp > max.makingDiscountPercentBp ? p : max));
    }

    const catMatches = activePromotions.filter((p) => p.scope === 'CATEGORY' && p.categoryId === categoryId);
    if (catMatches.length > 0) {
      return catMatches.reduce((max, p) => (p.makingDiscountPercentBp > max.makingDiscountPercentBp ? p : max));
    }

    const shopMatches = activePromotions.filter((p) => p.scope === 'SHOP_WIDE');
    if (shopMatches.length > 0) {
      return shopMatches.reduce((max, p) => (p.makingDiscountPercentBp > max.makingDiscountPercentBp ? p : max));
    }

    return null;
  }

  return (
    <div className="space-y-20 pb-20">
      {/* Multi-Slide Luxury Hero Carousel */}
      <HeroCarousel
        shopName={shop.name}
        shopCity={shop.city}
        whatsappNumber={whatsappNumber}
        slides={heroSlides}
      />

      {/* Luxury Trust Pillars */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-line rounded-card p-8 text-center space-y-3 shadow-card hover:border-line-strong transition-all">
            <span className="text-xs uppercase tracking-widest text-brand font-bold block">Purity Guarantee</span>
            <h3 className="font-display text-2xl font-bold text-ink">100% Hallmarked</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Every gold and silver piece comes with official BIS Hallmark certification of purity.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-card p-8 text-center space-y-3 shadow-card hover:border-line-strong transition-all">
            <span className="text-xs uppercase tracking-widest text-brand font-bold block">Live Pricing</span>
            <h3 className="font-display text-2xl font-bold text-ink">Transparent Rates</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Real-time daily metal rate calculations with selected weights. Zero hidden costs.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-card p-8 text-center space-y-3 shadow-card hover:border-line-strong transition-all">
            <span className="text-xs uppercase tracking-widest text-brand font-bold block">Virtual Trial</span>
            <h3 className="font-display text-2xl font-bold text-ink">WhatsApp Assistance</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Ghar baithe WhatsApp video call par design select karein aur live assistance lein.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-card p-8 text-center space-y-3 shadow-card hover:border-line-strong transition-all">
            <span className="text-xs uppercase tracking-widest text-brand font-bold block">Store Pickup</span>
            <h3 className="font-display text-2xl font-bold text-ink">Showroom Experience</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Online pasand karein aur nearest store par aakar trial ya pickup karein.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Categories with Generated Covers */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-brand block">Curated Collections</span>
            <h2 className="font-display text-3xl md:text-4xl text-ink font-bold">Browse by Category</h2>
            <p className="text-sm text-ink-muted">Fine handcrafted jewellery designed for every occasion</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                imageUrl={getCategoryImage(category.slug)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section id="collection" className="max-w-7xl mx-auto px-4 space-y-10 scroll-mt-24">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand block">Exquisite Artistry</span>
              <h2 className="font-display text-3xl md:text-4xl text-ink font-bold mt-1">Featured Collection</h2>
            </div>
            <Link href="/c/gold" className="text-sm font-semibold text-ink-muted hover:text-ink transition-colors flex items-center gap-1">
              <span>View All Products</span>
              <span>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => {
              const promo = resolvePromoForProduct(product.id, product.categoryId);
              return <ProductCard key={product.id} product={product} promotion={promo} />;
            })}
          </div>
        </section>
      )}

      {/* Store Visit & Private Appointment Banner with Showroom Image */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden bg-surface border border-line rounded-card p-8 md:p-14 text-left shadow-card min-h-[320px] flex items-center">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/showroom-trust.png"
              alt="Handcrafted Jewellery Heritage"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ground via-ground/90 to-ground/40" />
          </div>

          <div className="relative z-10 space-y-4 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-brand block">Visit Our Showroom</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink leading-tight">
              Personalised Shopping Experience
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed font-body">
              Visit our showroom at {shop.city}, {shop.state} to inspect our certified collection in person, or reach out on WhatsApp for custom designs and orders.
            </p>
            <div className="pt-2">
              <ButtonLink href="/contact" intent="primary" size="lg" className="justify-center px-8">
                Store Location & Timings
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
