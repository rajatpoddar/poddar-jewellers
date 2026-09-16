import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    order: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/shop', () => ({
  getShop: vi.fn(),
}));

vi.mock('@/lib/auth/customer-session', () => ({
  getCurrentCustomer: vi.fn(),
  createCustomerSessionCookie: vi.fn(),
}));

vi.mock('@/lib/orders/engine', () => ({
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock('@/lib/crm/activity', () => ({
  logCustomerActivity: vi.fn(),
}));

vi.mock('@/lib/whatsapp-notifications.server', () => ({
  enqueueNotification: vi.fn(),
  processNotificationQueue: vi.fn(),
}));

import { getShop } from '@/lib/shop';
import { getCurrentCustomer } from '@/lib/auth/customer-session';
import { createOrder, updateOrderStatus as updateOrderStatusEngine } from '@/lib/orders/engine';
import {
  enqueueNotification,
  processNotificationQueue,
} from '@/lib/whatsapp-notifications.server';
import { createOrderBooking, updateOrderStatus } from './orders.server';

describe('Order Notifications Event Triggers', () => {
  const mockShop = {
    id: 'shop_test_123',
    name: 'Test Jewellers',
    phone: '919876543210',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getShop).mockResolvedValue(mockShop as any);
    vi.mocked(enqueueNotification).mockResolvedValue({ id: 'mock_queue_id' } as any);
    vi.mocked(processNotificationQueue).mockResolvedValue({
      processed: 1,
      delivered: 1,
      failed: 0,
    });
  });

  describe('createOrderBooking notification triggers', () => {
    it('enqueues 2 notification records (ORDER_BOOKED for customer & ADMIN_NEW_ORDER_ALERT for shop) and triggers queue', async () => {
      vi.mocked(getCurrentCustomer).mockResolvedValue({
        id: 'cust_123',
        name: 'Aarav Sharma',
        phone: '919876543210',
      } as any);

      vi.mocked(createOrder).mockResolvedValue({
        id: 'order_abc',
        orderNumber: 'PJ-2026-0001',
        customerId: 'cust_123',
        customer: {
          id: 'cust_123',
          name: 'Aarav Sharma',
          phone: '919876543210',
        },
        items: [
          {
            id: 'item_1',
            productName: '22K Gold Bangle',
          },
        ],
      } as any);

      const res = await createOrderBooking({
        productId: 'prod_1',
        weightMg: 10000,
        requiredByDate: '2026-10-01',
        customerNotes: 'Please wrap nicely',
      });

      expect(res.success).toBe(true);
      expect(res.orderId).toBe('order_abc');
      expect(res.orderNumber).toBe('PJ-2026-0001');

      // 1. Customer notification
      expect(enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: mockShop.id,
          type: 'ORDER_BOOKED',
          recipient: '919876543210',
          orderId: 'order_abc',
          customerId: 'cust_123',
          payload: expect.objectContaining({
            customerName: 'Aarav Sharma',
            orderRef: 'PJ-2026-0001',
            productName: '22K Gold Bangle',
            requiredByDate: '2026-10-01',
            orderUrl: '/orders',
          }),
        })
      );

      // 2. Admin notification alert
      expect(enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: mockShop.id,
          type: 'ADMIN_NEW_ORDER_ALERT',
          recipient: mockShop.phone,
          orderId: 'order_abc',
          customerId: 'cust_123',
          payload: expect.objectContaining({
            customerName: 'Aarav Sharma',
            customerPhone: '919876543210',
            orderRef: 'PJ-2026-0001',
            productName: '22K Gold Bangle',
            adminOrderUrl: '/admin/orders',
          }),
        })
      );

      expect(enqueueNotification).toHaveBeenCalledTimes(2);
      expect(processNotificationQueue).toHaveBeenCalledWith(mockShop.id);
    });

    it('does not fail order booking if notification queuing or processing throws error', async () => {
      vi.mocked(getCurrentCustomer).mockResolvedValue({
        id: 'cust_123',
        name: 'Aarav Sharma',
        phone: '919876543210',
      } as any);

      vi.mocked(createOrder).mockResolvedValue({
        id: 'order_abc',
        orderNumber: 'PJ-2026-0001',
        customerId: 'cust_123',
      } as any);

      vi.mocked(enqueueNotification).mockRejectedValue(new Error('Queue service unavailable'));

      const res = await createOrderBooking({
        productId: 'prod_1',
        weightMg: 10000,
      });

      // HTTP order booking must succeed even if background notification fails
      expect(res.success).toBe(true);
      expect(res.orderId).toBe('order_abc');
    });
  });

  describe('updateOrderStatus notification triggers', () => {
    it('enqueues ORDER_STATUS_CHANGED when status becomes CONFIRMED', async () => {
      vi.mocked(updateOrderStatusEngine).mockResolvedValue({
        id: 'order_abc',
        orderNumber: 'PJ-2026-0001',
        customerId: 'cust_123',
        status: 'CONFIRMED',
        customer: {
          id: 'cust_123',
          name: 'Priya Verma',
          phone: '919876500000',
        },
      } as any);

      const res = await updateOrderStatus('order_abc', 'CONFIRMED');

      expect(res.success).toBe(true);
      expect(enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: mockShop.id,
          type: 'ORDER_STATUS_CHANGED',
          recipient: '919876500000',
          orderId: 'order_abc',
          customerId: 'cust_123',
          payload: expect.objectContaining({
            customerName: 'Priya Verma',
            orderRef: 'PJ-2026-0001',
            newStatus: 'CONFIRMED',
            orderUrl: '/orders',
          }),
        })
      );
      expect(processNotificationQueue).toHaveBeenCalledWith(mockShop.id);
    });

    it('enqueues ORDER_STATUS_CHANGED when status becomes READY', async () => {
      vi.mocked(updateOrderStatusEngine).mockResolvedValue({
        id: 'order_abc',
        orderNumber: 'PJ-2026-0001',
        customerId: 'cust_123',
        status: 'READY',
        customer: {
          id: 'cust_123',
          name: 'Priya Verma',
          phone: '919876500000',
        },
      } as any);

      const res = await updateOrderStatus('order_abc', 'READY');

      expect(res.success).toBe(true);
      expect(enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_STATUS_CHANGED',
          payload: expect.objectContaining({
            newStatus: 'READY',
          }),
        })
      );
      expect(processNotificationQueue).toHaveBeenCalledWith(mockShop.id);
    });

    it('enqueues ORDER_STATUS_CHANGED when status becomes COMPLETED', async () => {
      vi.mocked(updateOrderStatusEngine).mockResolvedValue({
        id: 'order_abc',
        orderNumber: 'PJ-2026-0001',
        customerId: 'cust_123',
        status: 'COMPLETED',
        customer: {
          id: 'cust_123',
          name: 'Priya Verma',
          phone: '919876500000',
        },
      } as any);

      const res = await updateOrderStatus('order_abc', 'COMPLETED');

      expect(res.success).toBe(true);
      expect(enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_STATUS_CHANGED',
          payload: expect.objectContaining({
            newStatus: 'COMPLETED',
          }),
        })
      );
      expect(processNotificationQueue).toHaveBeenCalledWith(mockShop.id);
    });

    it('does not enqueue notification for non-notifiable status changes (e.g. IN_PROGRESS)', async () => {
      vi.mocked(updateOrderStatusEngine).mockResolvedValue({
        id: 'order_abc',
        orderNumber: 'PJ-2026-0001',
        customerId: 'cust_123',
        status: 'IN_PROGRESS',
        customer: {
          id: 'cust_123',
          name: 'Priya Verma',
          phone: '919876500000',
        },
      } as any);

      const res = await updateOrderStatus('order_abc', 'IN_PROGRESS');

      expect(res.success).toBe(true);
      expect(enqueueNotification).not.toHaveBeenCalled();
      expect(processNotificationQueue).not.toHaveBeenCalled();
    });
  });
});
