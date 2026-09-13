import { describe, it, expect } from 'vitest';
import { makingSourceLabel } from './labels';

describe('makingSourceLabel', () => {
  it('names the product itself', () => {
    expect(makingSourceLabel({ percentBp: 1800, source: { kind: 'product' } }))
      .toBe('18% (is product ka apna)');
  });

  it('names the category it came from', () => {
    expect(makingSourceLabel({ percentBp: 1200, source: { kind: 'category', categoryName: 'Payal' } }))
      .toBe('12% (Payal category se)');
  });

  it('names the shop default', () => {
    expect(makingSourceLabel({ percentBp: 1500, source: { kind: 'default' } }))
      .toBe('15% (dukaan ke default se)');
  });

  it('renders a fractional percentage without trailing noise', () => {
    expect(makingSourceLabel({ percentBp: 1250, source: { kind: 'default' } }))
      .toBe('12.5% (dukaan ke default se)');
  });
});
