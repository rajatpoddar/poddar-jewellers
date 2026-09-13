import { describe, it, expect } from 'vitest';
import { resolveMakingPercent } from './making';

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
