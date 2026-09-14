import { describe, it, expect } from 'vitest';
import { parseSlugArray } from './slug';

export { parseSlugArray };

describe('parseSlugArray', () => {
  it('extracts leaf category slug from array path', () => {
    expect(parseSlugArray(['gold', 'payal'])).toBe('payal');
    expect(parseSlugArray(['bangles'])).toBe('bangles');
  });

  it('handles empty array gracefully', () => {
    expect(parseSlugArray([])).toBe('');
  });
});
