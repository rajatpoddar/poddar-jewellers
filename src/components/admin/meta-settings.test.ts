import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateMetaSettings,
  maskAccessToken,
  getMetaConnectionBadge,
} from './MetaSettingsForm';
import {
  updateMetaSettingsAction,
  testMetaApiConnectionAction,
} from '@/app/admin/(panel)/settings/actions';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/auth/session';

vi.mock('@/auth/session', () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock('@/lib/shop', () => ({
  getShop: vi.fn().mockResolvedValue({
    id: 'shop_test_123',
    name: 'Test Jewellery',
    metaPhoneNumberId: '10987654321',
    metaAccessToken: 'EAAB_test_saved_token',
    metaWabaId: '20987654321',
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    shop: {
      update: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Meta WhatsApp Cloud API Settings', () => {
  describe('Form Helper: validateMetaSettings', () => {
    it('allows clearing all credentials when all fields are empty or whitespace', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '   ',
        metaAccessToken: '',
        metaWabaId: null,
      });

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        metaPhoneNumberId: null,
        metaAccessToken: null,
        metaWabaId: null,
      });
      expect(result.error).toBeUndefined();
    });

    it('validates and trims valid credentials', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '  10987654321  ',
        metaAccessToken: '  EAAB_test_access_token_123  ',
        metaWabaId: ' 20987654321 ',
      });

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({
        metaPhoneNumberId: '10987654321',
        metaAccessToken: 'EAAB_test_access_token_123',
        metaWabaId: '20987654321',
      });
    });

    it('strips "Bearer " prefix from access token if user pasted it', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '10987654321',
        metaAccessToken: 'Bearer EAAB_test_token',
        metaWabaId: null,
      });

      expect(result.valid).toBe(true);
      expect(result.data?.metaAccessToken).toBe('EAAB_test_token');
    });

    it('fails if phone number id is provided without access token', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '10987654321',
        metaAccessToken: '',
        metaWabaId: null,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/access token/i);
    });

    it('fails if access token is provided without phone number id', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '',
        metaAccessToken: 'EAAB_test_token',
        metaWabaId: null,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/phone number id/i);
    });

    it('fails if phone number id contains non-digit characters', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '10987abc321',
        metaAccessToken: 'EAAB_test_token',
        metaWabaId: null,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/digits|anko/i);
    });

    it('fails if WABA id contains non-digit characters', () => {
      const result = validateMetaSettings({
        metaPhoneNumberId: '10987654321',
        metaAccessToken: 'EAAB_test_token',
        metaWabaId: 'waba-invalid-id',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/WABA ID|digits|anko/i);
    });
  });

  describe('Form Helper: maskAccessToken', () => {
    it('returns empty string for null, undefined, or empty token', () => {
      expect(maskAccessToken(null)).toBe('');
      expect(maskAccessToken(undefined)).toBe('');
      expect(maskAccessToken('')).toBe('');
      expect(maskAccessToken('   ')).toBe('');
    });

    it('masks long tokens showing only initial and trailing characters', () => {
      const masked = maskAccessToken('EAAB1234567890abcdef');
      expect(masked).toBe('EAAB••••••••cdef');
    });

    it('masks short tokens completely', () => {
      const masked = maskAccessToken('short');
      expect(masked).toBe('••••••••');
    });
  });

  describe('Form Helper: getMetaConnectionBadge', () => {
    it('returns neutral badge when unconfigured', () => {
      const badge = getMetaConnectionBadge({ isConfigured: false });
      expect(badge.tone).toBe('neutral');
      expect(badge.label).toMatch(/not configured/i);
    });

    it('returns warn badge when configured but not tested', () => {
      const badge = getMetaConnectionBadge({ isConfigured: true, isTested: false });
      expect(badge.tone).toBe('warn');
      expect(badge.label).toMatch(/untested/i);
    });

    it('returns good badge when connection test succeeds', () => {
      const badge = getMetaConnectionBadge({
        isConfigured: true,
        isTested: true,
        testSuccess: true,
      });
      expect(badge.tone).toBe('good');
      expect(badge.label).toMatch(/connected/i);
    });

    it('returns danger badge when connection test fails', () => {
      const badge = getMetaConnectionBadge({
        isConfigured: true,
        isTested: true,
        testSuccess: false,
      });
      expect(badge.tone).toBe('danger');
      expect(badge.label).toMatch(/error/i);
    });
  });

  describe('Server Action: updateMetaSettingsAction', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('rejects update if admin user is not authenticated', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.set('metaPhoneNumberId', '10987654321');
      formData.set('metaAccessToken', 'EAAB_test');

      const result = await updateMetaSettingsAction({}, formData);
      expect(result.error).toBe('Unauthorized');
      expect(db.shop.update).not.toHaveBeenCalled();
    });

    it('saves cleaned credentials to database for authenticated admin', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: 'admin_1', username: 'owner' } as any);
      vi.mocked(db.shop.update).mockResolvedValueOnce({} as any);

      const formData = new FormData();
      formData.set('metaPhoneNumberId', ' 10987654321 ');
      formData.set('metaAccessToken', ' Bearer EAAB_new_token ');
      formData.set('metaWabaId', ' 20987654321 ');

      const result = await updateMetaSettingsAction({}, formData);
      expect(result.error).toBeUndefined();
      expect(result.saved).toBe(true);

      expect(db.shop.update).toHaveBeenCalledWith({
        where: { id: 'shop_test_123' },
        data: {
          metaPhoneNumberId: '10987654321',
          metaAccessToken: 'EAAB_new_token',
          metaWabaId: '20987654321',
        },
      });
    });

    it('returns validation error without database update if inputs are invalid', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: 'admin_1', username: 'owner' } as any);

      const formData = new FormData();
      formData.set('metaPhoneNumberId', 'not-numbers');
      formData.set('metaAccessToken', 'EAAB_token');

      const result = await updateMetaSettingsAction({}, formData);
      expect(result.saved).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(db.shop.update).not.toHaveBeenCalled();
    });
  });

  describe('Server Action: testMetaApiConnectionAction', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.clearAllMocks();
    });

    it('rejects test if admin user is not authenticated', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce(null);

      const result = await testMetaApiConnectionAction(new FormData());
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('successfully verifies credentials against Meta Graph API v19.0', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: 'admin_1', username: 'owner' } as any);

      const mockMetaResponse = {
        verified_name: 'Test Jewellery Official',
        display_phone_number: '+91 98765 43210',
        id: '10987654321',
        quality_rating: 'GREEN',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetaResponse,
      });
      globalThis.fetch = fetchMock;

      const formData = new FormData();
      formData.set('metaPhoneNumberId', '10987654321');
      formData.set('metaAccessToken', 'EAAB_valid_token');

      const result = await testMetaApiConnectionAction(formData);

      expect(fetchMock).toHaveBeenCalled();
      const [url, requestInit] = fetchMock.mock.calls[0];
      expect(url).toContain('https://graph.facebook.com/v19.0/10987654321');
      expect(requestInit.headers.Authorization).toBe('Bearer EAAB_valid_token');

      expect(result.success).toBe(true);
      expect(result.message).toContain('+91 98765 43210');
      expect(result.details?.verifiedName).toBe('Test Jewellery Official');
    });

    it('returns error when Meta Graph API returns 401 unauthorized or invalid token', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: 'admin_1', username: 'owner' } as any);

      const mockErrorResponse = {
        error: {
          message: 'Invalid OAuth access token - Cannot parse access token',
          type: 'OAuthException',
          code: 190,
        },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      });
      globalThis.fetch = fetchMock;

      const formData = new FormData();
      formData.set('metaPhoneNumberId', '10987654321');
      formData.set('metaAccessToken', 'EAAB_invalid_token');

      const result = await testMetaApiConnectionAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid OAuth access token');
    });

    it('falls back to saved shop credentials if formData does not provide them', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: 'admin_1', username: 'owner' } as any);

      const mockMetaResponse = {
        verified_name: 'Test Jewellery Official',
        display_phone_number: '+91 98765 43210',
        id: '10987654321',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetaResponse,
      });
      globalThis.fetch = fetchMock;

      const result = await testMetaApiConnectionAction();

      expect(fetchMock).toHaveBeenCalled();
      const [url, requestInit] = fetchMock.mock.calls[0];
      expect(url).toContain('https://graph.facebook.com/v19.0/10987654321');
      expect(requestInit.headers.Authorization).toBe('Bearer EAAB_test_saved_token');
      expect(result.success).toBe(true);
    });
  });
});
