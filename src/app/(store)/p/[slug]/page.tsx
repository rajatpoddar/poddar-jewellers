import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getShop, getPricingConfig } from '@/lib/shop';
import { getLatestRateSet } from '@/lib/rates.server';
import { getCurrentCustomer } from '@/lib/auth/customer-session';
import { ProductGallery } from '@/components/store/ProductGallery';
import { WeightSelector } from '@/components/store/WeightSelector';
import { OfferBadge } from '@/components/store/OfferBadge';
import { resolveMakingPercent } from '@/lib/pricing/making';
import { resolveProductPromotionDetails } from '@/lib/promotions.server';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShop();
  const pricingConfig = await getPricingConfig();
  const latestRateSet = await getLatestRateSet();
  const customer = await getCurrentCustomer();

  const product = await db.product.findFirst({
    where: { shopId: shop.id, slug, status: 'LIVE' },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      weights: { orderBy: { sortOrder: 'asc' } },
      metalType: true,
      category: true,
    },
  });

  if (!product || !latestRateSet) {
    notFound();
  }

  const promoDetails = await resolveProductPromotionDetails(
    shop.id,
    product.categoryId,
    product.id,
  );

  const rateMap: Record<string, number> = {};
  latestRateSet.lines.forEach((line) => {
    rateMap[line.metalType.key] = line.pricePerGramPaise;
  });

  const effectiveMaking = resolveMakingPercent(
    { makingPercentBp: product.makingPercentBp },
    product.category ? [{ name: product.category.name, makingPercentBp: product.category.makingPercentBp }] : [],
    pricingConfig.defaultMakingPercentBp,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-12">
      <ProductGallery images={product.images} name={product.name} categorySlug={product.category?.slug} />

      <div className="space-y-6">
        <div>
          {promoDetails && (
            <div className="mb-3">
              <OfferBadge badgeText={promoDetails.badgeText} headline={promoDetails.headline} />
            </div>
          )}
          <span className="text-xs text-ink-muted uppercase tracking-wider block font-medium">
            {product.category?.name} · {product.metalType.label}
          </span>
          <h1 className="font-display text-3xl font-bold text-ink mt-1">{product.name}</h1>
          {product.description && (
            <p className="text-ink-muted text-sm mt-3">{product.description}</p>
          )}
        </div>

        {product.stoneDescription && (
          <div className="text-sm bg-surface border border-line p-3 rounded-card text-ink-muted">
            <strong className="text-ink font-medium">Stone Info:</strong> {product.stoneDescription}
          </div>
        )}

        <WeightSelector
          productId={product.id}
          productName={product.name}
          weights={product.weights}
          rates={rateMap}
          metalTypeKey={product.metalType.key}
          makingPercent={effectiveMaking.percentBp}
          makingPercentBp={effectiveMaking.percentBp}
          stoneValuePaise={product.stoneValuePaise}
          gstPercentBp={pricingConfig.gstPercentBp}
          rounding={pricingConfig.rounding}
          promotionDiscountBp={promoDetails?.promotionDiscountBp}
          initialCustomer={customer ? { name: customer.name || '', phone: customer.phone } : null}
          whatsappNumber={shop.whatsapp || ''}
        />
      </div>
    </div>
  );
}
