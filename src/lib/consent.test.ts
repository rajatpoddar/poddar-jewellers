import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMarketingConsentLogic } from './crm-consent-helpers';

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    notificationQueue: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/shop', () => ({
  getShop: vi.fn(),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  createCustomerSessionCookie: vi.fn(),
  syncWishlistToDatabase: vi.fn(),
  getCurrentCustomer: vi.fn(),
}));

vi.mock('@/lib/orders/engine', () => ({
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock('@/lib/crm/activity', () => ({
  logCustomerActivity: vi.fn(),
}));

import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { getCurrentCustomer } from '@/lib/auth/customer-session';
import { createOrder } from '@/lib/orders/engine';
import { registerCustomerProfile } from './auth.server';
import { createOrderBooking } from './orders.server';

describe('Marketing Consent Logic', () => {
  it('prepares consent update payload correctly when opted in', () => {
    const payload = updateMarketingConsentLogic(true, 'LOGIN_MODAL');
    expect(payload.marketingOptIn).toBe(true);
    expect(payload.optInSource).toBe('LOGIN_MODAL');
    expect(payload.optInAt).toBeInstanceOf(Date);
  });

  it('handles non-opted-in state', () => {
    const payload = updateMarketingConsentLogic(false, 'LOGIN_MODAL');
    expect(payload.marketingOptIn).toBe(false);
    expect(payload.optInSource).toBeNull();
    expect(payload.optInAt).toBeNull();
  });

  it('handles custom sources such as BOOKING_MODAL', () => {
    const payload = updateMarketingConsentLogic(true, 'BOOKING_MODAL');
    expect(payload.marketingOptIn).toBe(true);
    expect(payload.optInSource).toBe('BOOKING_MODAL');
    expect(payload.optInAt).toBeInstanceOf(Date);
  });
});

describe('Consent persistence in registerCustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getShop).mockResolvedValue({ id: 'shop_test123' } as any);
  });

  it('persists marketingOptIn=true and LOGIN_MODAL when opted in', async () => {
    vi.mocked(db.customer.upsert).mockResolvedValue({ id: 'cust_1' } as any);

    const res = await registerCustomerProfile({
      phone: '9876543210',
      name: 'Anjali Sharma',
      marketingOptIn: true,
    });

    expect(res.success).toBe(true);
    expect(db.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          marketingOptIn: true,
          optInSource: 'LOGIN_MODAL',
          optInAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          marketingOptIn: true,
          optInSource: 'LOGIN_MODAL',
          optInAt: expect.any(Date),
        }),
      })
    );
  });

  it('persists marketingOptIn=false and null source when opted out', async () => {
    vi.mocked(db.customer.upsert).mockResolvedValue({ id: 'cust_2' } as any);

    const res = await registerCustomerProfile({
      phone: '9876543210',
      name: 'Anjali Sharma',
      marketingOptIn: false,
    });

    expect(res.success).toBe(true);
    expect(db.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          marketingOptIn: false,
          optInSource: null,
          optInAt: null,
        }),
        update: expect.objectContaining({
          marketingOptIn: false,
          optInSource: null,
          optInAt: null,
        }),
      })
    );
  });
});

describe('Consent persistence in createOrderBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getShop).mockResolvedValue({ id: 'shop_test123' } as any);
    vi.mocked(createOrder).mockResolvedValue({
      id: 'order_1',
      orderNumber: 'PJ-2026-0001',
    } as any);
  });

  it('persists marketing consent on new customer registration during booking', async () => {
    vi.mocked(getCurrentCustomer).mockResolvedValue(null);
    vi.mocked(db.customer.upsert).mockResolvedValue({ id: 'cust_new' } as any);

    const res = await createOrderBooking({
      productId: 'prod_1',
      weightMg: 10000,
      name: 'Vikram Singh',
      phone: '9876543210',
      marketingOptIn: true,
    });

    expect(res.success).toBe(true);
    expect(db.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          marketingOptIn: true,
          optInSource: 'BOOKING_MODAL',
          optInAt: expect.any(Date),
        }),
      })
    );
  });

  it('updates consent fields if existing logged in customer passes marketingOptIn', async () => {
    vi.mocked(getCurrentCustomer).mockResolvedValue({ id: 'cust_existing' } as any);
    vi.mocked(db.customer.update).mockResolvedValue({ id: 'cust_existing' } as any);

    const res = await createOrderBooking({
      productId: 'prod_1',
      weightMg: 10000,
      marketingOptIn: true,
    });

    expect(res.success).toBe(true);
    expect(db.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust_existing' },
        data: expect.objectContaining({
          marketingOptIn: true,
          optInSource: 'BOOKING_MODAL',
          optInAt: expect.any(Date),
        }),
      })
    );
  });
});
