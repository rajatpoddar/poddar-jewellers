import { describe, it, expect } from 'vitest';
import { estimate } from './engine';
import type { RateSet, RoundingConfig } from './types';

const RATES: RateSet = {
  GOLD_24K: 1353000,   // Rs 13,530/g
  GOLD_22K: 1240000,   // Rs 12,400/g
  GOLD_18K: 1015000,   // Rs 10,150/g
  SILVER_999: 21600,   // Rs 216/g
};

const GST_BP = 300;

const ROUNDING: RoundingConfig = {
  stepPaise: 10000,        // Rs 100
  smallStepPaise: 1000,    // Rs 10
  thresholdPaise: 1000000, // Rs 10,000
};

describe('estimate', () => {
  it('prices the worked example from the spec: 23g of 22K at 15% making', () => {
    const r = estimate(
      { weightMg: 23000, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.metalPaise).toBe(28520000);      // Rs 2,85,200
    expect(r.makingPaise).toBe(4278000);      // Rs 42,780
    expect(r.stonePaise).toBe(0);
    expect(r.subtotalPaise).toBe(32798000);   // Rs 3,27,980
    expect(r.gstPaise).toBe(983940);          // Rs 9,839.40
    expect(r.totalPaise).toBe(33781940);
    expect(r.displayPaise).toBe(33790000);    // Rs 3,37,900
  });

  it('scales with the selected weight', () => {
    const base = { metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 };
    const at20 = estimate({ ...base, weightMg: 20000 }, RATES, GST_BP, ROUNDING);
    const at25 = estimate({ ...base, weightMg: 25000 }, RATES, GST_BP, ROUNDING);
    expect(at20.displayPaise).toBe(29380000); // Rs 2,93,800
    expect(at25.displayPaise).toBe(36720000); // Rs 3,67,200
  });

  it('uses the rate for the product’s own metal type', () => {
    const base = { weightMg: 10000, makingPercentBp: 1500, stoneValuePaise: 0 };
    expect(estimate({ ...base, metalKey: 'GOLD_24K' }, RATES, GST_BP, ROUNDING).metalPaise).toBe(13530000);
    expect(estimate({ ...base, metalKey: 'GOLD_18K' }, RATES, GST_BP, ROUNDING).metalPaise).toBe(10150000);
    expect(estimate({ ...base, metalKey: 'SILVER_999' }, RATES, GST_BP, ROUNDING).metalPaise).toBe(216000);
  });

  it('works with a metal type this shop invented', () => {
    // Proves the engine has no hardcoded list of purities.
    const rates: RateSet = { ...RATES, SILVER_925: 20000 };
    const r = estimate(
      { weightMg: 30000, metalKey: 'SILVER_925', makingPercentBp: 1500, stoneValuePaise: 0 },
      rates, GST_BP, ROUNDING,
    );
    expect(r.metalPaise).toBe(600000); // 30g x Rs 200
  });

  it('handles fractional gram weights', () => {
    const r = estimate(
      { weightMg: 4200, metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.metalPaise).toBe(4263000); // 4.2g x Rs 10,150 = Rs 42,630
  });

  it('adds a stone value that does not scale with weight', () => {
    const withStone = { metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 4500000 };
    const light = estimate({ ...withStone, weightMg: 4200 }, RATES, GST_BP, ROUNDING);
    const heavy = estimate({ ...withStone, weightMg: 8400 }, RATES, GST_BP, ROUNDING);
    expect(light.stonePaise).toBe(4500000);
    expect(heavy.stonePaise).toBe(4500000);
    expect(heavy.metalPaise).toBe(light.metalPaise * 2);
  });

  it('charges making on the metal value only, never on the stone', () => {
    const r = estimate(
      { weightMg: 4200, metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 4500000 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.makingPaise).toBe(639450); // 15% of Rs 42,630, not of Rs 87,630
  });

  it('charges GST on metal plus making plus stone', () => {
    const r = estimate(
      { weightMg: 4200, metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 4500000 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.subtotalPaise).toBe(4263000 + 639450 + 4500000);
    expect(r.gstPaise).toBe(282074); // 3% of Rs 94,024.50
  });

  it('rounds up to the nearest Rs 10 below the Rs 10,000 threshold', () => {
    const r = estimate(
      { weightMg: 30000, metalKey: 'SILVER_999', makingPercentBp: 1500, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.totalPaise).toBe(767556);   // Rs 7,675.56
    expect(r.displayPaise).toBe(768000); // Rs 7,680
  });

  it('never displays less than the true total', () => {
    for (let mg = 1000; mg <= 60000; mg += 137) {
      const r = estimate(
        { weightMg: mg, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      );
      expect(r.displayPaise).toBeGreaterThanOrEqual(r.totalPaise);
    }
  });

  it('handles a zero making charge', () => {
    const r = estimate(
      { weightMg: 23000, metalKey: 'GOLD_22K', makingPercentBp: 0, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.makingPaise).toBe(0);
    expect(r.subtotalPaise).toBe(28520000);
  });

  it('throws when today’s rates carry no line for this metal type', () => {
    expect(() =>
      estimate(
        { weightMg: 23000, metalKey: 'PLATINUM_950', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      ),
    ).toThrow(/PLATINUM_950/);
  });

  it('throws rather than picking up an inherited Object property as a rate', () => {
    expect(() =>
      estimate(
        { weightMg: 23000, metalKey: 'toString', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      ),
    ).toThrow(/toString/);
  });

  it('rejects a non-positive weight', () => {
    expect(() =>
      estimate(
        { weightMg: 0, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      ),
    ).toThrow(/weight/i);
  });

  describe('promotional making charge discounts', () => {
    it('returns hasDiscount: false, discountAmountPaise: 0, originalTotalPaise: undefined when no discount is provided', () => {
      const r = estimate(
        { weightMg: 23000, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      );
      expect(r.hasDiscount).toBe(false);
      expect(r.discountAmountPaise).toBe(0);
      expect(r.originalTotalPaise).toBeUndefined();
    });

    it('applies a 25% promo making charge discount reducing making charge by 25%', () => {
      // Worked example: 23g 22K gold @ Rs 12,400/g = Rs 2,85,200 (28520000 paise)
      // Base making 15% (1500 bp) = Rs 42,780 (4278000 paise)
      // Promo discount 25% (2500 bp) -> effective making 11.25% (1125 bp)
      // Effective making = 28520000 * 1125 / 10000 = 3208500 paise (Rs 32,085)
      // Un-discounted total: subtotal 32798000 + GST 983940 = 33781940 -> display 33790000 (Rs 3,37,900)
      // Discounted total: subtotal 31728500 + GST 951855 = 32680355 -> display 32690000 (Rs 3,26,900)
      // originalTotalPaise = 33790000
      // discountAmountPaise = 33790000 - 32690000 = 1100000 (Rs 11,000)
      const r = estimate(
        {
          weightMg: 23000,
          metalKey: 'GOLD_22K',
          makingPercentBp: 1500,
          stoneValuePaise: 0,
          promotionDiscountBp: 2500,
        },
        RATES, GST_BP, ROUNDING,
      );

      expect(r.makingPaise).toBe(3208500); // Rs 32,085
      expect(r.hasDiscount).toBe(true);
      expect(r.displayPaise).toBe(32690000); // Rs 3,26,900
      expect(r.originalTotalPaise).toBe(33790000); // Rs 3,37,900
      expect(r.discountAmountPaise).toBe(1100000); // Rs 11,000
    });

    it('rounds up discounted total to the rounding step', () => {
      const r = estimate(
        {
          weightMg: 23000,
          metalKey: 'GOLD_22K',
          makingPercentBp: 1500,
          stoneValuePaise: 0,
          promotionDiscountBp: 2500,
        },
        RATES, GST_BP, ROUNDING,
      );
      expect(r.displayPaise).toBeGreaterThanOrEqual(r.totalPaise);
      expect(r.displayPaise % ROUNDING.stepPaise).toBe(0);
    });

    it('returns hasDiscount: false when base making charge is 0', () => {
      const r = estimate(
        {
          weightMg: 23000,
          metalKey: 'GOLD_22K',
          makingPercentBp: 0,
          stoneValuePaise: 0,
          promotionDiscountBp: 2500,
        },
        RATES, GST_BP, ROUNDING,
      );
      expect(r.hasDiscount).toBe(false);
      expect(r.discountAmountPaise).toBe(0);
      expect(r.originalTotalPaise).toBeUndefined();
    });
  });
});
