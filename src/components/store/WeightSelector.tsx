'use client';

import { useState } from 'react';
import type { ProductWeight } from '@prisma/client';
import { estimate } from '@/lib/pricing/engine';
import { formatINR } from '@/lib/money';
import { Button, ButtonLink } from '@/components/ui/Button';
import { WishlistButton } from '@/components/store/WishlistButton';
import { BookOrderModal } from '@/components/store/BookOrderModal';
import { ProductPriceDisplay } from '@/components/store/ProductPriceDisplay';
import type { RoundingConfig } from '@/lib/pricing/types';

export function buildWhatsAppLink(
  whatsappNumber: string,
  productName: string,
  weightGrams: number,
  formattedPrice: string,
): string {
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const text = `Namaste! Mujhe '${productName}' (${weightGrams}g - ${formattedPrice}) ke baare mein jaankari chahiye.`;
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

type Props = {
  productId?: string;
  productName: string;
  weights: ProductWeight[];
  rates: Record<string, number>;
  metalTypeKey: string;
  makingPercent?: number;
  makingPercentBp?: number;
  stoneValuePaise: number;
  gstPercentBp: number;
  rounding?: RoundingConfig;
  promotionDiscountBp?: number;
  initialCustomer?: { name: string; phone: string } | null;
  whatsappNumber: string;
};

const DEFAULT_ROUNDING: RoundingConfig = {
  stepPaise: 10000,
  smallStepPaise: 1000,
  thresholdPaise: 1000000,
};

function getGrams(w: ProductWeight): number {
  if ('weightGrams' in w && typeof (w as unknown as { weightGrams: number }).weightGrams === 'number') {
    return (w as unknown as { weightGrams: number }).weightGrams;
  }
  return w.weightMg ? w.weightMg / 1000 : 0;
}

function getMg(w: ProductWeight): number {
  if (w.weightMg) return w.weightMg;
  if ('weightGrams' in w && typeof (w as unknown as { weightGrams: number }).weightGrams === 'number') {
    return Math.round((w as unknown as { weightGrams: number }).weightGrams * 1000);
  }
  return 0;
}

export function WeightSelector({
  productId,
  productName,
  weights,
  rates,
  metalTypeKey,
  makingPercent,
  makingPercentBp: explicitBp,
  stoneValuePaise,
  gstPercentBp,
  rounding = DEFAULT_ROUNDING,
  promotionDiscountBp,
  initialCustomer,
  whatsappNumber,
}: Props) {
  const [selectedWeight, setSelectedWeight] = useState<ProductWeight | null>(weights[0] || null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const resolvedMakingBp =
    explicitBp ??
    (makingPercent !== undefined
      ? makingPercent > 100
        ? Math.round(makingPercent)
        : Math.round(makingPercent * 100)
      : 0);

  const selectedWeightMg = selectedWeight ? getMg(selectedWeight) : 0;
  const selectedWeightGrams = selectedWeight ? getGrams(selectedWeight) : 0;

  const hasRate = Boolean(rates && Object.prototype.hasOwnProperty.call(rates, metalTypeKey));

  let priceResult = null;
  if (selectedWeight && selectedWeightMg > 0 && hasRate) {
    try {
      priceResult = estimate(
        {
          metalKey: metalTypeKey,
          makingPercentBp: resolvedMakingBp,
          stoneValuePaise: stoneValuePaise || 0,
          weightMg: selectedWeightMg,
          promotionDiscountBp,
        },
        rates,
        gstPercentBp,
        rounding,
      );
    } catch {
      priceResult = null;
    }
  }

  const formattedPrice = priceResult ? formatINR(priceResult.displayPaise) : 'N/A';
  const waLink =
    priceResult && selectedWeight
      ? buildWhatsAppLink(whatsappNumber, productName, selectedWeightGrams, formattedPrice)
      : '#';

  return (
    <div className="space-y-6">
      {/* Weight Chips */}
      {weights.length > 0 && (
        <div>
          <label className="text-sm font-medium text-ink block mb-2">Weight Select Karein:</label>
          <div className="flex flex-wrap gap-2">
            {weights.map((w) => {
              const currentMg = getMg(w);
              const isSelected = Boolean(
                selectedWeight && (selectedWeight.id === w.id || getMg(selectedWeight) === currentMg)
              );
              const grams = getGrams(w);
              return (
                <button
                  key={w.id || `w-${currentMg}`}
                  type="button"
                  onClick={() => setSelectedWeight(w)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-field border transition-all cursor-pointer touch-manipulation min-h-[44px] min-w-[72px] flex items-center justify-center active:scale-95 ${
                    isSelected
                      ? 'border-brand bg-brand-soft text-brand font-semibold ring-1 ring-brand'
                      : 'border-line bg-surface text-ink hover:border-line-strong'
                  }`}
                >
                  <span className="numeric">{grams}</span> gram
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Price Card */}
      <div className="bg-surface-sunk border border-line rounded-card p-6 space-y-2">
        <span className="text-xs text-ink-muted uppercase tracking-wider block">Estimated Price</span>
        {priceResult ? (
          <ProductPriceDisplay
            displayPaise={priceResult.displayPaise}
            originalTotalPaise={priceResult.originalTotalPaise}
            hasDiscount={priceResult.hasDiscount}
            discountAmountPaise={priceResult.discountAmountPaise}
            size="lg"
          />
        ) : (
          <div className="font-display text-3xl font-bold text-ink numeric">
            N/A <span className="text-sm font-normal text-ink-muted">(approx.)</span>
          </div>
        )}
        <p className="text-xs text-ink-faint pt-1">
          Aaj ke rate par anumaanit, sab tax shaamil. Final price bill banate samay weigh machine par decide hoga.
        </p>
      </div>

      {/* WhatsApp, Book & Wishlist Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {productId && selectedWeight && (
          <Button
            type="button"
            intent="primary"
            size="lg"
            className="flex-1 justify-center"
            onClick={() => setIsBookModalOpen(true)}
          >
            Book / Reserve Design
          </Button>
        )}
        <ButtonLink href={waLink} intent="secondary" size="lg" className="flex-1 justify-center">
          WhatsApp Par Poochhein
        </ButtonLink>
        {productId && (
          <div className="border border-line rounded-field px-4 py-2.5 flex items-center justify-center bg-surface hover:border-line-strong transition-colors min-h-[44px]">
            <WishlistButton productId={productId} showText />
          </div>
        )}
      </div>

      {productId && selectedWeight && (
        <BookOrderModal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          productId={productId}
          productName={productName}
          weightMg={selectedWeightMg}
          weightGrams={selectedWeightGrams}
          formattedPrice={formattedPrice}
          initialCustomer={initialCustomer}
        />
      )}
    </div>
  );
}
