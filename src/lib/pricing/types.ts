/**
 * A metal type's stable key, e.g. "GOLD_22K" or "SILVER_925".
 *
 * Deliberately a string and not a union: which purities a shop deals in is a
 * fact about that shop, stored as rows in `metal_types`. Another shop running
 * this software may carry 14K or platinum, and must be able to add it from the
 * admin panel without a migration.
 */
export type MetalKey = string;

/** Paise per gram, keyed by metal type key, as entered by the shop each morning. */
export type RateSet = Readonly<Record<MetalKey, number>>;

export interface PriceInput {
  /** Integer milligrams. 23g is 23000. */
  weightMg: number;
  metalKey: MetalKey;
  /** Already resolved through the cascade. Basis points. */
  makingPercentBp: number;
  /** Fixed rupee value of any stone or diamond. Does not scale with weight. */
  stoneValuePaise: number;
}

export interface RoundingConfig {
  /** Step at or above the threshold. Rs 100 is 10000. */
  stepPaise: number;
  /** Step below the threshold. Rs 10 is 1000. */
  smallStepPaise: number;
  /** Rs 10,000 is 1000000. */
  thresholdPaise: number;
}

export interface PriceBreakdown {
  metalPaise: number;
  makingPaise: number;
  stonePaise: number;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  /** Rounded up. The only figure the customer is ever shown. */
  displayPaise: number;
}
