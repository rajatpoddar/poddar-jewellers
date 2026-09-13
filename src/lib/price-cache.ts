import { estimate } from './pricing/engine';
import type { PriceInput, RateSet, RoundingConfig } from './pricing/types';

/**
 * A product's cheapest and dearest weight option, at today's rate.
 *
 * Persisted on Product so listing pages can filter and sort by price without
 * recomputing the whole catalog on every request. Recomputed for every product
 * whenever a rate is saved.
 */
export function priceRange(
  weightsMg: number[],
  base: Omit<PriceInput, 'weightMg'>,
  rates: RateSet,
  gstPercentBp: number,
  rounding: RoundingConfig,
): { minPaise: number; maxPaise: number } {
  if (weightsMg.length === 0) {
    throw new Error('priceRange: a product needs at least one weight option');
  }

  const prices = weightsMg.map(
    (weightMg) => estimate({ ...base, weightMg }, rates, gstPercentBp, rounding).displayPaise,
  );

  return { minPaise: Math.min(...prices), maxPaise: Math.max(...prices) };
}
