import { cache } from 'react';
import { db } from './db';
import type { RoundingConfig } from './pricing/types';

/**
 * The shop this request belongs to.
 *
 * Today there is exactly one, so this returns it. This software is sold one
 * deployment per shop; the day a deployment serves several, THIS FUNCTION is the
 * only thing that changes — it resolves the shop from the request's domain
 * instead. Every shop-owned table already carries `shopId`, so nothing else has
 * to move.
 *
 * Never read a shop row any other way. `cache` deduplicates within a render.
 */
export const getShop = cache(async () => {
  const shop = await db.shop.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!shop) {
    throw new Error('No shop row found. Run `npm run db:seed`.');
  }
  return shop;
});

export const getPricingConfig = cache(async (): Promise<{
  gstPercentBp: number;
  defaultMakingPercentBp: number;
  rounding: RoundingConfig;
}> => {
  const shop = await getShop();
  return {
    gstPercentBp: shop.gstPercentBp,
    defaultMakingPercentBp: shop.defaultMakingPercentBp,
    rounding: {
      stepPaise: shop.roundingStepPaise,
      smallStepPaise: shop.roundingSmallStepPaise,
      thresholdPaise: shop.roundingThresholdPaise,
    },
  };
});

/** Active metal types, in the order the shop arranged them. */
export const getMetalTypes = cache(async () => {
  const shop = await getShop();
  return db.metalType.findMany({
    where: { shopId: shop.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
});
