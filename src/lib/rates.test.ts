import { describe, it, expect } from 'vitest';
import { rateStatus, percentChangeBp } from './rates';

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
