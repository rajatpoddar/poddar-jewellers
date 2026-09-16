import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as handleRatesPost } from './rates/route';
import { GET as handleAnalyticsGet } from './analytics/route';
import { GET as handleLeadsGet } from './leads/wishlist-no-order/route';
import { POST as handleOutreachPost } from './outreach/send/route';

import { db } from '@/lib/db';
import { authenticateAgentRequest } from '@/lib/agent-auth.server';
import { recomputeProductPrices } from '@/lib/price-cache.server';
import { enqueueNotification } from '@/lib/whatsapp-notifications.server';

vi.mock('@/lib/db', () => ({
  db: {
    metalType: {
      findMany: vi.fn(),
    },
    rate: {
      create: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    wishlistItem: {
      count: vi.fn(),
    },
    customerActivity: {
      count: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    outreachLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/agent-auth.server', () => ({
  authenticateAgentRequest: vi.fn(),
}));

vi.mock('@/lib/price-cache.server', () => ({
  recomputeProductPrices: vi.fn(),
  recomputeAllPriceCaches: vi.fn(),
}));

vi.mock('@/lib/whatsapp-notifications.server', () => ({
  enqueueNotification: vi.fn(),
}));

describe('Hermes Agent REST Endpoints (/api/agent/v1/...)', () => {
  const mockShop = {
    id: 'shop-test-123',
    name: 'Sample Jewellery Shop',
  };

  const mockAuth = {
    shop: mockShop,
    apiKey: {
      id: 'key-1',
      name: 'Hermes Agent Core',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. POST /api/agent/v1/rates', () => {
    it('returns 401 Unauthorized when authenticateAgentRequest fails', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/agent/v1/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: [{ metalKey: 'GOLD_22K', ratePerGramRupees: 7200 }] }),
      });

      const response = await handleRatesPost(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 200 OK and recomputes prices when valid rates are posted', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(mockAuth as any);
      vi.mocked(db.metalType.findMany).mockResolvedValueOnce([
        { id: 'metal-22k', key: 'GOLD_22K', isActive: true },
      ] as any);

      const mockCreatedAt = new Date('2026-09-16T10:00:00.000Z');
      vi.mocked(db.rate.create).mockResolvedValueOnce({
        id: 'rate-new',
        shopId: mockShop.id,
        enteredBy: 'Hermes Agent Core',
        createdAt: mockCreatedAt,
      } as any);

      const request = new Request('http://localhost:3000/api/agent/v1/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: [{ metalKey: 'GOLD_22K', ratePerGramRupees: 7200 }],
        }),
      });

      const response = await handleRatesPost(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        success: true,
        effectiveAt: mockCreatedAt.toISOString(),
        ratesUpdatedCount: 1,
      });

      expect(db.rate.create).toHaveBeenCalledWith({
        data: {
          shopId: mockShop.id,
          enteredBy: 'Hermes Agent Core',
          lines: {
            create: [
              {
                metalTypeId: 'metal-22k',
                pricePerGramPaise: 720000,
              },
            ],
          },
        },
      });

      expect(recomputeProductPrices).toHaveBeenCalledWith(mockShop.id);
    });
  });

  describe('2. GET /api/agent/v1/analytics', () => {
    it('returns 401 Unauthorized when authenticateAgentRequest fails', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/agent/v1/analytics?period=today');
      const response = await handleAnalyticsGet(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 200 OK with formatted analytics summary', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(mockAuth as any);
      vi.mocked(db.order.findMany).mockResolvedValueOnce([
        { id: 'o1', status: 'CONFIRMED', totalPaise: 3000000 },
        { id: 'o2', status: 'COMPLETED', totalPaise: 5000000 },
        { id: 'o3', status: 'CANCELLED', totalPaise: 2000000 },
      ] as any);

      vi.mocked(db.wishlistItem.count).mockResolvedValueOnce(14);
      vi.mocked(db.customerActivity.count).mockResolvedValueOnce(42);

      const request = new Request('http://localhost:3000/api/agent/v1/analytics?period=today');
      const response = await handleAnalyticsGet(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.period).toBe('today');
      expect(data.orders.count).toBe(3);
      expect(data.orders.totalRevenuePaise).toBe(8000000); // 3000000 + 5000000 (excluding CANCELLED)
      expect(data.orders.statusBreakdown).toEqual({
        CONFIRMED: 1,
        COMPLETED: 1,
        CANCELLED: 1,
      });
      expect(data.engagement.wishlistAdditions).toBe(14);
      expect(data.engagement.productViews).toBe(42);
    });
  });

  describe('3. GET /api/agent/v1/leads/wishlist-no-order', () => {
    it('returns 401 Unauthorized when authenticateAgentRequest fails', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/agent/v1/leads/wishlist-no-order');
      const response = await handleLeadsGet(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 200 OK with customers who have wishlist items but 0 orders', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(mockAuth as any);
      const mockAddedAt = new Date('2026-09-15T14:30:00.000Z');

      vi.mocked(db.customer.findMany).mockResolvedValueOnce([
        {
          id: 'cust-1',
          name: 'Aarti Verma',
          phone: '9876543210',
          wishlist: [
            {
              id: 'wish-1',
              product: {
                id: 'prod-101',
                name: 'Kangan 22K',
                slug: 'kangan-22k',
                cachedPriceMinPaise: 4500000,
                cachedPriceMaxPaise: 5000000,
              },
              createdAt: mockAddedAt,
            },
          ],
        },
      ] as any);

      const request = new Request('http://localhost:3000/api/agent/v1/leads/wishlist-no-order');
      const response = await handleLeadsGet(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(1);
      expect(data.leads).toHaveLength(1);
      expect(data.leads[0]).toEqual({
        customerId: 'cust-1',
        name: 'Aarti Verma',
        phone: '9876543210',
        wishlistItems: [
          {
            id: 'wish-1',
            productId: 'prod-101',
            productName: 'Kangan 22K',
            productSlug: 'kangan-22k',
            cachedPriceMinPaise: 4500000,
            cachedPriceMaxPaise: 5000000,
            addedAt: mockAddedAt.toISOString(),
          },
        ],
      });

      expect(db.customer.findMany).toHaveBeenCalledWith({
        where: {
          shopId: mockShop.id,
          wishlist: { some: {} },
          orders: { none: {} },
        },
        select: expect.any(Object),
      });
    });
  });

  describe('4. POST /api/agent/v1/outreach/send', () => {
    it('returns 401 Unauthorized when authenticateAgentRequest fails', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/agent/v1/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: '9876543210',
          messageText: 'Hello from Acme Jewellers',
        }),
      });

      const response = await handleOutreachPost(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('returns 200 OK and dispatches outreach log & notification', async () => {
      vi.mocked(authenticateAgentRequest).mockResolvedValueOnce(mockAuth as any);
      vi.mocked(db.customer.upsert).mockResolvedValueOnce({
        id: 'cust-88',
        shopId: mockShop.id,
        phone: '9876543210',
        name: 'Grahak',
      } as any);

      vi.mocked(db.outreachLog.create).mockResolvedValueOnce({
        id: 'log-1',
      } as any);

      vi.mocked(enqueueNotification).mockResolvedValueOnce({
        id: 'queue-1',
      } as any);

      const request = new Request('http://localhost:3000/api/agent/v1/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: '9876543210',
          messageText: 'Aapka wishlist item ab discount par hai!',
        }),
      });

      const response = await handleOutreachPost(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deliveryMethod).toBe('WHATSAPP');
      expect(data.whatsappDeepLink).toContain('https://wa.me/919876543210?text=');

      expect(db.customer.upsert).toHaveBeenCalledWith({
        where: {
          shopId_phone: {
            shopId: mockShop.id,
            phone: '9876543210',
          },
        },
        update: {},
        create: {
          shopId: mockShop.id,
          phone: '9876543210',
          name: 'Grahak',
        },
      });

      expect(db.outreachLog.create).toHaveBeenCalledWith({
        data: {
          shopId: mockShop.id,
          customerId: 'cust-88',
          messageText: 'Aapka wishlist item ab discount par hai!',
          channel: 'WHATSAPP',
        },
      });

      expect(enqueueNotification).toHaveBeenCalledWith({
        shopId: mockShop.id,
        type: 'MARKETING_OUTREACH',
        recipient: '9876543210',
        payload: {
          message: 'Aapka wishlist item ab discount par hai!',
          productId: undefined,
        },
        customerId: 'cust-88',
      });
    });
  });
});
