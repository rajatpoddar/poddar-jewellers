import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink } from './WeightSelector';

export { buildWhatsAppLink };

describe('buildWhatsAppLink', () => {
  it('generates correct deep link with pre-filled Hinglish message', () => {
    const link = buildWhatsAppLink('919800000000', 'Rani Haar', 25, '₹3,18,000');
    expect(link).toContain('https://wa.me/919800000000?text=');
    expect(decodeURIComponent(link)).toContain("Rani Haar' (25g - ₹3,18,000)");
  });

  it('strips non-digits from the phone number', () => {
    const link = buildWhatsAppLink('+91 98000 00000', 'Kangan', 10, '₹1,20,000');
    expect(link).toContain('https://wa.me/919800000000?text=');
  });
});
