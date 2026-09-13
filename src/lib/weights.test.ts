import { describe, it, expect } from 'vitest';
import { parseWeights } from './weights';

describe('parseWeights', () => {
  it('parses a comma-separated list into milligrams', () => {
    expect(parseWeights('20, 23, 25')).toEqual([20000, 23000, 25000]);
  });

  it('accepts a g suffix and stray whitespace', () => {
    expect(parseWeights('20g  23g\n25g')).toEqual([20000, 23000, 25000]);
  });

  it('handles fractional grams', () => {
    expect(parseWeights('4.2, 5')).toEqual([4200, 5000]);
  });

  it('sorts ascending regardless of input order', () => {
    expect(parseWeights('25, 20, 23')).toEqual([20000, 23000, 25000]);
  });

  it('removes duplicates', () => {
    expect(parseWeights('20, 20, 23')).toEqual([20000, 23000]);
  });

  it('rejects a non-numeric entry', () => {
    expect(() => parseWeights('20, bees, 25')).toThrow(/weight/i);
  });

  it('rejects zero, negative and empty input', () => {
    expect(() => parseWeights('20, 0')).toThrow(/weight/i);
    expect(() => parseWeights('-5')).toThrow(/weight/i);
    expect(() => parseWeights('   ')).toThrow(/weight/i);
  });
});
