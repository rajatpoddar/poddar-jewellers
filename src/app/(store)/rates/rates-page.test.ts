import { describe, it, expect } from 'vitest';
import { formatRateDate } from './rates-helper';

export { formatRateDate };

describe('formatRateDate', () => {
  it('formats date in Indian English locale format', () => {
    const formatted = formatRateDate(new Date('2026-09-14T10:00:00Z'));
    expect(formatted).toContain('2026');
  });
});
