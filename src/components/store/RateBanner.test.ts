import { describe, it, expect } from 'vitest';
import { getStalenessBannerText } from './RateBanner';

describe('getStalenessBannerText', () => {
  it('returns warning banner text if rates are >48 hours old', () => {
    expect(getStalenessBannerText(50)).toBe('Rate 2 din se update nahi hua — confirm karne ke liye call kariye');
  });

  it('returns null for fresh rates', () => {
    expect(getStalenessBannerText(12)).toBeNull();
  });
});
