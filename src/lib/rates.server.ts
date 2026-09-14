// Kept separate from the pure `rates.ts` so the unit tests can import that
// module without pulling Prisma or any server-only API into the test process.

import { cache } from 'react';
import { db } from './db';
import { getShop } from './shop';
import { rateStatus } from './rates';
import type { RateSet } from './pricing/types';

export const getLatestRate = cache(async () => {
  const shop = await getShop();

  const rate = await db.rate.findFirst({
    where: { shopId: shop.id },
    orderBy: { createdAt: 'desc' },
    include: { lines: { include: { metalType: { select: { key: true } } } } },
  });
  if (!rate) return null;

  // A null-prototype object keyed by metal-type key — exactly what the engine
  // expects, with no knowledge of which purities this particular shop deals in,
  // and no inherited properties to mistake for a rate.
  const rates: Record<string, number> = Object.create(null);
  for (const line of rate.lines) {
    rates[line.metalType.key] = line.pricePerGramPaise;
  }

  return { rates: rates as RateSet, enteredAt: rate.createdAt, enteredBy: rate.enteredBy };
});

export const getRateSnapshot = cache(async () => {
  const latest = await getLatestRate();
  if (!latest) return null;

  const shop = await getShop();
  return {
    rates: latest.rates,
    enteredAt: latest.enteredAt,
    status: rateStatus(latest.enteredAt, new Date(), shop.rateWarnHours, shop.rateStaleHours),
  };
});

export const getLatestRateSet = cache(async () => {
  const shop = await getShop();

  const rate = await db.rate.findFirst({
    where: { shopId: shop.id },
    orderBy: { createdAt: 'desc' },
    include: {
      lines: {
        include: {
          metalType: true,
        },
        orderBy: {
          metalType: { sortOrder: 'asc' },
        },
      },
    },
  });
  if (!rate) return null;

  return {
    ...rate,
    effectiveAt: rate.createdAt,
  };
});

