import { describe, it, expect } from 'vitest';
import { rupeesToPaise, applyPercentBp, roundUpPaise, formatINR } from './money';

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise(12400)).toBe(1240000);
  });

  it('converts rupees with paise without float drift', () => {
    expect(rupeesToPaise(216.35)).toBe(21635);
    expect(rupeesToPaise(0.1)).toBe(10);
  });

  it('rejects negatives', () => {
    expect(() => rupeesToPaise(-1)).toThrow();
  });
});

describe('applyPercentBp', () => {
  it('applies 15% (1500 bp)', () => {
    expect(applyPercentBp(28520000, 1500)).toBe(4278000);
  });

  it('applies 3% (300 bp)', () => {
    expect(applyPercentBp(32798000, 300)).toBe(983940);
  });

  it('rounds to the nearest paisa', () => {
    expect(applyPercentBp(101, 300)).toBe(3);
  });

  it('returns zero for zero bp', () => {
    expect(applyPercentBp(28520000, 0)).toBe(0);
  });
});

describe('roundUpPaise', () => {
  it('rounds up to the nearest Rs 100', () => {
    expect(roundUpPaise(33781940, 10000)).toBe(33790000);
  });

  it('leaves an exact multiple untouched', () => {
    expect(roundUpPaise(33790000, 10000)).toBe(33790000);
  });

  it('rounds up by a single paisa over', () => {
    expect(roundUpPaise(33790001, 10000)).toBe(33800000);
  });

  it('rounds up to the nearest Rs 10', () => {
    expect(roundUpPaise(864512, 1000)).toBe(865000);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(33790000)).toBe('₹3,37,900');
  });

  it('groups lakhs and crores the Indian way, not in thousands', () => {
    expect(formatINR(1234567800)).toBe('₹1,23,45,678');
    expect(formatINR(100000000)).toBe('₹10,00,000');
  });

  it('formats small amounts', () => {
    expect(formatINR(21600)).toBe('₹216');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });
});
