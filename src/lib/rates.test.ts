import { describe, it, expect } from 'vitest';
import { rateStatus, percentChangeBp, significantMoves } from './rates';

const at = (iso: string) => new Date(iso);

describe('rateStatus', () => {
  const entered = at('2026-09-13T08:00:00Z');

  it('is fresh within the warn window', () => {
    expect(rateStatus(entered, at('2026-09-13T20:00:00Z'), 24, 48)).toBe('FRESH');
  });

  it('warns once past the warn threshold', () => {
    expect(rateStatus(entered, at('2026-09-14T09:00:00Z'), 24, 48)).toBe('WARN');
  });

  it('is stale once past the stale threshold', () => {
    expect(rateStatus(entered, at('2026-09-15T09:00:00Z'), 24, 48)).toBe('STALE');
  });

  it('is fresh exactly at the warn threshold', () => {
    expect(rateStatus(entered, at('2026-09-14T08:00:00Z'), 24, 48)).toBe('FRESH');
  });

  it('warns exactly at the stale threshold', () => {
    expect(rateStatus(entered, at('2026-09-15T08:00:00Z'), 24, 48)).toBe('WARN');
  });

  it('treats a clock skewed into the past as fresh', () => {
    expect(rateStatus(entered, at('2026-09-13T07:00:00Z'), 24, 48)).toBe('FRESH');
  });
});

describe('percentChangeBp', () => {
  it('reports a rise in basis points', () => {
    expect(percentChangeBp(1200000, 1240000)).toBe(333); // +3.33%
  });

  it('reports a fall as negative', () => {
    expect(percentChangeBp(1240000, 1200000)).toBe(-323);
  });

  it('reports no change as zero', () => {
    expect(percentChangeBp(1240000, 1240000)).toBe(0);
  });

  it('reports zero when there is no previous rate to compare against', () => {
    expect(percentChangeBp(0, 1240000)).toBe(0);
  });
});

describe('significantMoves', () => {
  const entries = [
    { label: 'Gold 24K', previousRupees: 13530, nextRupees: 13600 },  // +0.5%
    { label: 'Gold 22K', previousRupees: 12400, nextRupees: 14000 },  // +12.9%
    { label: 'Silver 999', previousRupees: 216, nextRupees: 180 },    // -16.7%
  ];

  it('returns only the entries that moved past the threshold', () => {
    const moves = significantMoves(entries, 10);
    expect(moves.map((m) => m.label)).toEqual(['Gold 22K', 'Silver 999']);
  });

  it('reports the direction and size of each move', () => {
    const [gold, silver] = significantMoves(entries, 10);
    expect(gold.percentChange).toBeCloseTo(12.9, 1);
    expect(silver.percentChange).toBeCloseTo(-16.67, 1);
  });

  it('catches the typo this guard exists for — a stray extra digit', () => {
    const moves = significantMoves(
      [{ label: 'Gold 22K', previousRupees: 12400, nextRupees: 124000 }],
      10,
    );
    expect(moves).toHaveLength(1);
    expect(moves[0].percentChange).toBeCloseTo(900, 0);
  });

  it('returns nothing when every move is small', () => {
    expect(significantMoves([{ label: 'Gold 22K', previousRupees: 12400, nextRupees: 12500 }], 10))
      .toEqual([]);
  });

  it('ignores a metal with no previous rate — there is nothing to compare', () => {
    expect(significantMoves([{ label: 'Silver 925', previousRupees: 0, nextRupees: 200 }], 10))
      .toEqual([]);
  });

  it('ignores an unparseable or non-positive new value', () => {
    expect(significantMoves([{ label: 'Gold 22K', previousRupees: 12400, nextRupees: NaN }], 10))
      .toEqual([]);
    expect(significantMoves([{ label: 'Gold 22K', previousRupees: 12400, nextRupees: 0 }], 10))
      .toEqual([]);
  });

  it('treats a move exactly at the threshold as significant', () => {
    expect(significantMoves([{ label: 'Gold 22K', previousRupees: 1000, nextRupees: 1100 }], 10))
      .toHaveLength(1);
  });
});
