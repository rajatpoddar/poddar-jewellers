import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { generateApiKey, deleteApiKey } from '@/lib/agent-auth.server';
import { createApiKeyAction, deleteApiKeyAction } from './actions';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/auth/session', () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock('@/lib/shop', () => ({
  getShop: vi.fn(),
}));

vi.mock('@/lib/agent-auth.server', () => ({
  generateApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
}));

describe('API Keys Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiKeyAction', () => {
    it('returns error if user is not authorized', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      const result = await createApiKeyAction('Hermes Agent');

      expect(result).toEqual({ success: false, error: 'Unauthorized' });
      expect(generateApiKey).not.toHaveBeenCalled();
    });

    it('returns error if name is empty', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue({ id: 'admin-1', username: 'owner' } as any);

      const result = await createApiKeyAction('   ');

      expect(result).toEqual({ success: false, error: 'API Key ka naam zaroori hai.' });
      expect(generateApiKey).not.toHaveBeenCalled();
    });

    it('creates API key successfully when authorized', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue({ id: 'admin-1', username: 'owner' } as any);
      vi.mocked(getShop).mockResolvedValue({ id: 'shop-123' } as any);
      vi.mocked(generateApiKey).mockResolvedValue({
        rawKey: 'hermes_live_secret123',
        apiKey: { id: 'key-1' } as any,
      });

      const result = await createApiKeyAction('Hermes Agent Production');

      expect(getShop).toHaveBeenCalled();
      expect(generateApiKey).toHaveBeenCalledWith('shop-123', 'Hermes Agent Production');
      expect(result).toEqual({
        success: true,
        rawKey: 'hermes_live_secret123',
      });
    });
  });

  describe('deleteApiKeyAction', () => {
    it('returns error if user is not authorized', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      const result = await deleteApiKeyAction('key-1');

      expect(result).toEqual({ success: false, error: 'Unauthorized' });
      expect(deleteApiKey).not.toHaveBeenCalled();
    });

    it('returns error if id is missing', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue({ id: 'admin-1', username: 'owner' } as any);

      const result = await deleteApiKeyAction('');

      expect(result).toEqual({ success: false, error: 'Invalid key ID' });
      expect(deleteApiKey).not.toHaveBeenCalled();
    });

    it('deletes API key successfully when authorized', async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue({ id: 'admin-1', username: 'owner' } as any);
      vi.mocked(deleteApiKey).mockResolvedValue({ id: 'key-1' } as any);

      const result = await deleteApiKeyAction('key-1');

      expect(deleteApiKey).toHaveBeenCalledWith('key-1');
      expect(result).toEqual({ success: true });
    });
  });
});
