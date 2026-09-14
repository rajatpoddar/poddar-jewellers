import { describe, it, expect } from 'vitest';
import { getPriceRangeLabel } from './ProductCard';

export { getPriceRangeLabel };

describe('getPriceRangeLabel', () => {
  it('formats range when min and max differ', () => {
    expect(getPriceRangeLabel(29380000, 36720000)).toBe('₹2,93,800 – ₹3,67,200');
  });

  it('formats single price when min equals max', () => {
    expect(getPriceRangeLabel(8850000, 8850000)).toBe('₹88,500 (approx)');
  });

  it('handles null min price', () => {
    expect(getPriceRangeLabel(null, null)).toBe('Price on request');
  });

  it('handles null max price with valid min price', () => {
    expect(getPriceRangeLabel(8850000, null)).toBe('₹88,500 (approx)');
  });
});
