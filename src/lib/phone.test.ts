import { describe, it, expect } from 'vitest';
import { normalizePhone, formatEvolutionPhone } from './phone';

describe('Phone Number Normalization', () => {
  it('normalizes 10-digit Indian mobile number', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });

  it('normalizes mobile number with +91 or leading 0', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });

  it('formats number for Evolution API payload with 91 prefix', () => {
    expect(formatEvolutionPhone('9876543210')).toBe('919876543210');
    expect(formatEvolutionPhone('+91 98765 43210')).toBe('919876543210');
  });
});
