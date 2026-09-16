import { describe, it, expect } from 'vitest';
import { enhanceCopy } from './ai-copywriter';

describe('enhanceCopy', () => {
  it('enhances headline copy with gold/jewellery sparkle tone', () => {
    const result = enhanceCopy({ text: 'Dhanteras offer', context: 'headline' });
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan('Dhanteras offer'.length);
    expect(result).toContain('Dhanteras');
  });

  it('enhances promo copy with clear making charge offer details', () => {
    const result = enhanceCopy({ text: '25% off making charges', context: 'promo' });
    expect(result).toBeTruthy();
    expect(result).toContain('25%');
  });

  it('enhances whatsapp outreach text with warm Hinglish greeting and ShopName variable', () => {
    const result = enhanceCopy({ text: 'Check new bridal necklace designs', context: 'whatsapp' });
    expect(result).toBeTruthy();
    expect(result).toContain('{{ShopName}}');
  });

  it('enhances product description with traditional gold filigree copy', () => {
    const result = enhanceCopy({ text: 'Gold necklace 22k Hallmark', context: 'description' });
    expect(result).toBeTruthy();
    expect(result).toContain('Hallmark');
  });

  it('returns original text if input is empty or whitespace', () => {
    expect(enhanceCopy({ text: '', context: 'headline' })).toBe('');
    expect(enhanceCopy({ text: '   ', context: 'headline' })).toBe('');
  });
});
