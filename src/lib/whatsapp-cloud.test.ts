import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatMetaCloudPayload,
  sendMetaCloudTemplateMessage,
} from './whatsapp-cloud.server';

describe('Meta WhatsApp Cloud API Client', () => {
  describe('formatMetaCloudPayload', () => {
    it('formats template message payload correctly with default language', () => {
      const payload = formatMetaCloudPayload({
        recipientPhone: '919876543210',
        templateName: 'festive_offer_v1',
        parameters: ['Aarav Sharma', 'Gold Bangles'],
      });

      expect(payload.messaging_product).toBe('whatsapp');
      expect(payload.recipient_type).toBe('individual');
      expect(payload.to).toBe('919876543210');
      expect(payload.type).toBe('template');
      expect(payload.template.name).toBe('festive_offer_v1');
      expect(payload.template.language.code).toBe('hi');
      expect(payload.template.components).toHaveLength(1);
      expect(payload.template.components[0].type).toBe('body');
      expect(payload.template.components[0].parameters).toEqual([
        { type: 'text', text: 'Aarav Sharma' },
        { type: 'text', text: 'Gold Bangles' },
      ]);
    });

    it('cleans formatted phone numbers with spaces, pluses, and hyphens', () => {
      const payload = formatMetaCloudPayload({
        recipientPhone: '+91 (987) 654-3210',
        templateName: 'welcome_v1',
      });

      expect(payload.to).toBe('919876543210');
    });

    it('prepends 91 country code for 10-digit Indian numbers', () => {
      const payload = formatMetaCloudPayload({
        recipientPhone: '9876543210',
        templateName: 'welcome_v1',
      });

      expect(payload.to).toBe('919876543210');
    });

    it('respects custom language code when provided', () => {
      const payload = formatMetaCloudPayload({
        recipientPhone: '919876543210',
        templateName: 'festive_offer_v1',
        languageCode: 'en_US',
        parameters: ['Aarav Sharma'],
      });

      expect(payload.template.language.code).toBe('en_US');
    });

    it('handles empty parameters list', () => {
      const payload = formatMetaCloudPayload({
        recipientPhone: '919876543210',
        templateName: 'generic_announcement',
      });

      expect(payload.template.components[0].parameters).toEqual([]);
    });
  });

  describe('sendMetaCloudTemplateMessage', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('sends HTTP POST to Meta Graph API v19.0 endpoint with Bearer auth', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '919876543210', wa_id: '919876543210' }],
        messages: [{ id: 'wamid.HBgLMTIzNDU2' }],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock;

      const result = await sendMetaCloudTemplateMessage({
        phoneNumberId: '10987654321',
        accessToken: 'EAABtest_token_123',
        recipientPhone: '919876543210',
        templateName: 'order_update_v1',
        parameters: ['Aarav', 'ORD-123'],
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, requestInit] = fetchMock.mock.calls[0];
      expect(url).toBe('https://graph.facebook.com/v19.0/10987654321/messages');
      expect(requestInit.method).toBe('POST');
      expect(requestInit.headers).toEqual({
        'Authorization': 'Bearer EAABtest_token_123',
        'Content-Type': 'application/json',
      });

      const body = JSON.parse(requestInit.body);
      expect(body.to).toBe('919876543210');
      expect(body.template.name).toBe('order_update_v1');
      expect(result).toEqual(mockResponse);
    });

    it('throws descriptive error on Meta API failure status', async () => {
      const errorResponse = {
        error: {
          message: 'Invalid OAuth access token.',
          type: 'OAuthException',
          code: 190,
        },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorResponse,
      });
      globalThis.fetch = fetchMock;

      await expect(
        sendMetaCloudTemplateMessage({
          phoneNumberId: '10987654321',
          accessToken: 'invalid_token',
          recipientPhone: '919876543210',
          templateName: 'order_update_v1',
        })
      ).rejects.toThrow(
        'Meta API error (401): {"error":{"message":"Invalid OAuth access token.","type":"OAuthException","code":190}}'
      );
    });

    it('throws if credentials are missing', async () => {
      await expect(
        sendMetaCloudTemplateMessage({
          phoneNumberId: '',
          accessToken: 'some_token',
          recipientPhone: '919876543210',
          templateName: 'test',
        })
      ).rejects.toThrow('Missing Meta Cloud API credentials');
    });
  });
});
