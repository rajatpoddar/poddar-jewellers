// The database-backed counterpart to the pure `priceRange` in price-cache.ts,
// kept separate for the same reason as rates.server.ts.

import { db } from './db';
import { getShop, getPricingConfig } from './shop';
import { getLatestRate } from './rates.server';
import { resolveMakingPercent } from './pricing/making';
import { priceRange } from './price-cache';

/** Nearest-ancestor-first chain above and including each category. */
async function categoryChains(shopId: string) {
  const categories = await db.category.findMany({
    where: { shopId },
    select: { id: true, name: true, parentId: true, makingPercentBp: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  const chains = new Map<string, Array<{ name: string; makingPercentBp: number | null }>>();
  for (const category of categories) {
    const chain: Array<{ name: string; makingPercentBp: number | null }> = [];
    let cursor: (typeof categories)[number] | undefined = category;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chain.push({ name: cursor.name, makingPercentBp: cursor.makingPercentBp });
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    chains.set(category.id, chain);
  }
  return chains;
}

/**
 * Re-price every product against the newest rate.
 *
 * Called whenever a rate is saved, and whenever anything else that feeds the
 * engine changes — a category's making override, the shop's default making
 * charge, GST, or the rounding steps.
 *
 * At the catalog sizes this shop will reach it is a single pass over a few
 * hundred rows: fast enough to run inline, with no queue and no background
 * worker to operate.
 */
export async function recomputeAllPriceCaches(): Promise<number> {
  const latest = await getLatestRate();
  if (!latest) return 0;

  const shop = await getShop();
  const { gstPercentBp, defaultMakingPercentBp, rounding } = await getPricingConfig();
  const chains = await categoryChains(shop.id);

  const products = await db.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      makingPercentBp: true,
      stoneValuePaise: true,
      categoryId: true,
      metalType: { select: { key: true } },
      weights: { select: { weightMg: true } },
    },
  });

  const now = new Date();
  let updated = 0;

  for (const product of products) {
    const weightsMg = product.weights.map((w) => w.weightMg);
    const metalKey = product.metalType.key;

    // A product with no weights cannot be priced, and neither can one whose
    // metal type has no line in today's rate — the shop may have added the
    // metal type after entering this morning's rate. Clear the cache rather
    // than leave a number that no longer means anything.
    const priceable =
      weightsMg.length > 0 && Object.prototype.hasOwnProperty.call(latest.rates, metalKey);

    if (!priceable) {
      await db.product.update({
        where: { id: product.id },
        data: { cachedPriceMinPaise: null, cachedPriceMaxPaise: null, cachedAt: now },
      });
      continue;
    }

    const { percentBp } = resolveMakingPercent(
      { makingPercentBp: product.makingPercentBp },
      chains.get(product.categoryId) ?? [],
      defaultMakingPercentBp,
    );

    const { minPaise, maxPaise } = priceRange(
      weightsMg,
      { metalKey, makingPercentBp: percentBp, stoneValuePaise: product.stoneValuePaise },
      latest.rates,
      gstPercentBp,
      rounding,
    );

    await db.product.update({
      where: { id: product.id },
      data: { cachedPriceMinPaise: minPaise, cachedPriceMaxPaise: maxPaise, cachedAt: now },
    });
    updated += 1;
  }

  return updated;
}
