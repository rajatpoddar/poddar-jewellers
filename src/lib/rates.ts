export type RateStatus = 'FRESH' | 'WARN' | 'STALE';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * How old the shop's last rate entry is.
 *
 * FRESH — normal.
 * WARN  — admin shows a prominent warning.
 * STALE — the storefront shows a banner asking the customer to call.
 *
 * Prices are never hidden at any level. A site that hides its prices is
 * useless; the rate's date is shown on product pages instead.
 */
export function rateStatus(
  enteredAt: Date,
  now: Date,
  warnHours: number,
  staleHours: number,
): RateStatus {
  // Both thresholds are exclusive: a rate becomes WARN only once it is PAST
  // warnHours, and STALE only once it is PAST staleHours. Exactly on the hour
  // still counts as the gentler state.
  const ageHours = (now.getTime() - enteredAt.getTime()) / MS_PER_HOUR;
  if (ageHours > staleHours) return 'STALE';
  if (ageHours > warnHours) return 'WARN';
  return 'FRESH';
}

/**
 * Change from the previous rate, in basis points, for the admin's save
 * confirmation. A typo of one extra digit shows up here as a huge number before
 * it ever reaches a customer.
 */
export function percentChangeBp(previousPaise: number, nextPaise: number): number {
  if (previousPaise <= 0) return 0;
  return Math.round(((nextPaise - previousPaise) * 10000) / previousPaise);
}

export interface RateMove {
  label: string;
  previousRupees: number;
  nextRupees: number;
  /** Signed percentage. +12.9 means the rate rose by 12.9%. */
  percentChange: number;
}

/**
 * Which of today's entries moved far enough to be worth a second look.
 *
 * This is the last thing standing between a typo and every price on the
 * website. Kept here, pure and tested, rather than inline in the form — the
 * confirmation dialog it drives cannot be exercised by an automated browser
 * without blocking it.
 *
 * Entries with no previous rate are skipped: a metal type added this morning
 * has nothing to be compared against.
 */
export function significantMoves(
  entries: Array<{ label: string; previousRupees: number; nextRupees: number }>,
  thresholdPercent: number,
): RateMove[] {
  return entries.flatMap((entry) => {
    const { previousRupees, nextRupees } = entry;

    if (previousRupees <= 0) return [];
    if (!Number.isFinite(nextRupees) || nextRupees <= 0) return [];

    const percentChange = ((nextRupees - previousRupees) / previousRupees) * 100;
    if (Math.abs(percentChange) < thresholdPercent) return [];

    return [{ ...entry, percentChange }];
  });
}
