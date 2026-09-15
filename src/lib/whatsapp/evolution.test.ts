import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeIndianPhone,
  buildEvolutionPayload,
  sendWhatsAppOtp,
} from './evolution';

describe('Evolution API WhatsApp Helper', () => {
  it('formats 10-digit Indian phone numbers to 91XXXXXXXXXX', () => {
    expect(sanitizeIndianPhone('9876543210')).toBe('919876543210');
    expect(sanitizeIndianPhone('+91 98765 43210')).toBe('919876543210');
  });

  it('builds text message payload for Evolution API', () => {
    const payload = buildEvolutionPayload('919876543210', 'Aapka OTP hai 123456');
    expect(payload).toEqual({
      number: '919876543210',
      text: 'Aapka OTP hai 123456',
    });
  });

  describe('sendWhatsAppOtp', () => {
    const mockShop = {
      evolutionApiUrl: 'http://192.168.29.101:8087',
      evolutionApiKey: 'test-api-key',
      evolutionInstance: 'NregaBot',
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('sends OTP via Evolution API fetch POST when server is reachable', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'PENDING' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await sendWhatsAppOtp(mockShop, '9876543210', '123456');
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.29.101:8087/message/sendText/NregaBot',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            apikey: 'test-api-key',
          }),
          body: JSON.stringify({
            number: '919876543210',
            text: 'Aapka OTP hai 123456',
          }),
        })
      );
    });

    it('falls back gracefully to console log if fetch fails (e.g. offline/network error)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await sendWhatsAppOtp(mockShop, '9876543210', '123456');
      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WhatsApp OTP Fallback] Phone: 919876543210 OTP: 123456')
      );
    });
  });
});
