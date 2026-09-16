import { describe, it, expect } from 'vitest';
import { resolveMakingPercent, calculateEffectiveMakingBp } from './making';

const DEFAULT_BP = 1500;

describe('resolveMakingPercent', () => {
  it('uses the product override when present', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: 1800 },
      [{ name: 'Payal', makingPercentBp: 1200 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1800);
    expect(r.source).toEqual({ kind: 'product' });
  });

  it('falls back to the nearest ancestor category', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: null },
      [{ name: 'Payal', makingPercentBp: 1200 }, { name: 'Anklets', makingPercentBp: 1400 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1200);
    expect(r.source).toEqual({ kind: 'category', categoryName: 'Payal' });
  });

  it('skips categories with no override and keeps walking up', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: null },
      [{ name: 'Payal', makingPercentBp: null }, { name: 'Anklets', makingPercentBp: 1400 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1400);
    expect(r.source).toEqual({ kind: 'category', categoryName: 'Anklets' });
  });

  it('falls back to the shop default when nothing overrides', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: null },
      [{ name: 'Payal', makingPercentBp: null }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1500);
    expect(r.source).toEqual({ kind: 'default' });
  });

  it('uses the default for a product with no category chain at all', () => {
    const r = resolveMakingPercent({ makingPercentBp: null }, [], DEFAULT_BP);
    expect(r.percentBp).toBe(1500);
    expect(r.source).toEqual({ kind: 'default' });
  });

  it('treats an explicit zero override as a real value, not as absent', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: 0 },
      [{ name: 'Payal', makingPercentBp: 1200 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(0);
    expect(r.source).toEqual({ kind: 'product' });
  });
});

describe('calculateEffectiveMakingBp', () => {
  it('returns base making bp when no discount is provided or discount is non-positive', () => {
    expect(calculateEffectiveMakingBp(1500)).toBe(1500);
    expect(calculateEffectiveMakingBp(1500, 0)).toBe(1500);
    expect(calculateEffectiveMakingBp(1500, -500)).toBe(1500);
  });

  it('reduces making charge by the discount percentage in basis points', () => {
    // 15% (1500 bp) with 25% discount (2500 bp) -> 11.25% (1125 bp)
    expect(calculateEffectiveMakingBp(1500, 2500)).toBe(1125);
    // 10% (1000 bp) with 50% discount (5000 bp) -> 5% (500 bp)
    expect(calculateEffectiveMakingBp(1000, 5000)).toBe(500);
  });

  it('clamps maximum discount to 10000 (100%)', () => {
    expect(calculateEffectiveMakingBp(1000, 10000)).toBe(0);
    expect(calculateEffectiveMakingBp(1000, 15000)).toBe(0);
  });
});
