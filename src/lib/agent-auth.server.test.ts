import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { generateApiKey, authenticateAgentRequest } from './agent-auth.server';

vi.mock('@/lib/db', () => ({
  db: {
    apiKey: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Agent Authentication Middleware (agent-auth.server)', () => {
  const mockShop = {
    id: 'shop-123',
    name: 'Test Jewellery',
    slug: 'test-jewellery',
    tagline: 'Best jewellery',
    phone: '919876543210',
    whatsappNumber: '919876543210',
    email: 'contact@example.com',
    address: '123 Main Street',
    logoUrl: null,
    heroImageUrl: null,
    goldColor: 'gold',
    primaryColor: 'primary',
    accentColor: 'accent',
    surfaceColor: 'surface',
    fontHead: 'Inter',
    fontBody: 'Inter',
    defaultMakingChargeBp: 1000,
    gstPercentBp: 300,
    roundingStepRupees: 10,
    disclaimerText: '',
    heroTitle: '',
    heroSubtitle: '',
    seoKeywords: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('generates a random raw key with prefix and stores SHA-256 hash in db', async () => {
      const mockApiKeyRecord = {
        id: 'key-1',
        shopId: 'shop-123',
        name: 'Hermes Agent',
        keyPrefix: 'hermes_live_abcd',
        keyHash: 'somehash',
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.apiKey.create).mockResolvedValue(mockApiKeyRecord as any);

      const result = await generateApiKey('shop-123', 'Hermes Agent');

      expect(result.rawKey).toMatch(/^hermes_live_[a-f0-9]{64}$/);
      const expectedPrefix = result.rawKey.slice(0, 16); // hermes_live_ + 4 hex chars
      const expectedHash = crypto.createHash('sha256').update(result.rawKey).digest('hex');

      expect(db.apiKey.create).toHaveBeenCalledWith({
        data: {
          shopId: 'shop-123',
          name: 'Hermes Agent',
          keyPrefix: expectedPrefix,
          keyHash: expectedHash,
        },
      });

      expect(result.apiKey).toBe(mockApiKeyRecord);
    });
  });

  describe('authenticateAgentRequest', () => {
    it('authenticates request with valid Authorization: Bearer <rawKey> header', async () => {
      const rawKey = 'hermes_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const expectedHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const mockApiKeyRecord = {
        id: 'key-1',
        shopId: 'shop-123',
        name: 'Hermes Agent',
        keyPrefix: 'hermes_live_0123',
        keyHash: expectedHash,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        shop: mockShop,
      };

      vi.mocked(db.apiKey.findUnique).mockResolvedValue(mockApiKeyRecord as any);
      vi.mocked(db.apiKey.update).mockResolvedValue(mockApiKeyRecord as any);

      const request = new Request('http://localhost:3000/api/agent/v1/rates', {
        headers: {
          Authorization: `Bearer ${rawKey}`,
        },
      });

      const result = await authenticateAgentRequest(request);

      expect(db.apiKey.findUnique).toHaveBeenCalledWith({
        where: { keyHash: expectedHash },
        include: { shop: true },
      });

      expect(result).toEqual({
        shop: mockShop,
        apiKey: mockApiKeyRecord,
      });

      expect(db.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('authenticates request with valid X-Hermes-API-Key header', async () => {
      const rawKey = 'hermes_live_fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      const expectedHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const mockApiKeyRecord = {
        id: 'key-2',
        shopId: 'shop-123',
        name: 'Hermes Agent 2',
        keyPrefix: 'hermes_live_fedc',
        keyHash: expectedHash,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        shop: mockShop,
      };

      vi.mocked(db.apiKey.findUnique).mockResolvedValue(mockApiKeyRecord as any);
      vi.mocked(db.apiKey.update).mockResolvedValue(mockApiKeyRecord as any);

      const request = new Request('http://localhost:3000/api/agent/v1/analytics', {
        headers: {
          'X-Hermes-API-Key': rawKey,
        },
      });

      const result = await authenticateAgentRequest(request);

      expect(db.apiKey.findUnique).toHaveBeenCalledWith({
        where: { keyHash: expectedHash },
        include: { shop: true },
      });

      expect(result).toEqual({
        shop: mockShop,
        apiKey: mockApiKeyRecord,
      });
    });

    it('returns null if no auth headers are provided', async () => {
      const request = new Request('http://localhost:3000/api/agent/v1/rates');
      const result = await authenticateAgentRequest(request);

      expect(result).toBeNull();
      expect(db.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('returns null if token is not found in database', async () => {
      vi.mocked(db.apiKey.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/agent/v1/rates', {
        headers: {
          Authorization: 'Bearer hermes_live_invalidkey',
        },
      });

      const result = await authenticateAgentRequest(request);

      expect(result).toBeNull();
      expect(db.apiKey.findUnique).toHaveBeenCalled();
    });

    it('returns null if header is empty string or only whitespace', async () => {
      const request = new Request('http://localhost:3000/api/agent/v1/rates', {
        headers: {
          Authorization: 'Bearer    ',
        },
      });

      const result = await authenticateAgentRequest(request);

      expect(result).toBeNull();
      expect(db.apiKey.findUnique).not.toHaveBeenCalled();
    });
  });
});
