export type MakingSource =
  | { kind: 'product' }
  | { kind: 'category'; categoryName: string }
  | { kind: 'default' };

export interface MakingResolution {
  percentBp: number;
  source: MakingSource;
}

/**
 * Most specific wins: the product's own override, then the nearest ancestor
 * category with an override, then the shop default.
 *
 * `categoryChain` is ordered nearest-first: the product's own category, then its
 * parent, and so on up the tree.
 *
 * The admin UI renders `source` so a non-technical user can always see where an
 * effective percentage came from.
 */
export function resolveMakingPercent(
  product: { makingPercentBp: number | null },
  categoryChain: Array<{ name: string; makingPercentBp: number | null }>,
  defaultBp: number,
): MakingResolution {
  if (product.makingPercentBp !== null) {
    return { percentBp: product.makingPercentBp, source: { kind: 'product' } };
  }

  for (const category of categoryChain) {
    if (category.makingPercentBp !== null) {
      return {
        percentBp: category.makingPercentBp,
        source: { kind: 'category', categoryName: category.name },
      };
    }
  }

  return { percentBp: defaultBp, source: { kind: 'default' } };
}

/**
 * Calculates the effective making charge basis points after applying a promotional discount.
 *
 * `promotionDiscountBp` is integer basis points off making charge (e.g. 2500 = 25% off making charges).
 * Discount is clamped between 0 and 10000 (100%).
 */
export function calculateEffectiveMakingBp(
  baseMakingBp: number,
  promotionDiscountBp?: number,
): number {
  if (!promotionDiscountBp || promotionDiscountBp <= 0) return baseMakingBp;
  const clampedDiscount = Math.min(10000, promotionDiscountBp);
  return Math.max(0, Math.round((baseMakingBp * (10000 - clampedDiscount)) / 10000));
}
