import { describe, it, expect } from 'vitest';
import { priceRange } from './price-cache';
import type { RateSet, RoundingConfig } from './pricing/types';

const RATES: RateSet = {
  GOLD_24K: 1353000, GOLD_22K: 1240000, GOLD_18K: 1015000, SILVER_999: 21600,
};
const GST_BP = 300;
const ROUNDING: RoundingConfig = {
  stepPaise: 10000, smallStepPaise: 1000, thresholdPaise: 1000000,
};
const BASE = { metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 };

describe('priceRange', () => {
  it('spans the cheapest and dearest weight options', () => {
    const r = priceRange([23000, 20000, 25000], BASE, RATES, GST_BP, ROUNDING);
    expect(r.minPaise).toBe(29380000); // 20g
    expect(r.maxPaise).toBe(36720000); // 25g
  });

  it('returns an equal min and max for a single weight', () => {
    const r = priceRange([23000], BASE, RATES, GST_BP, ROUNDING);
    expect(r.minPaise).toBe(33790000);
    expect(r.maxPaise).toBe(33790000);
  });

  it('is insensitive to the order the weights arrive in', () => {
    const a = priceRange([25000, 20000, 23000], BASE, RATES, GST_BP, ROUNDING);
    const b = priceRange([20000, 23000, 25000], BASE, RATES, GST_BP, ROUNDING);
    expect(a).toEqual(b);
  });

  it('throws when a product has no weight options', () => {
    expect(() => priceRange([], BASE, RATES, GST_BP, ROUNDING)).toThrow(/weight/i);
  });
});
