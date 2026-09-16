import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatNotificationText,
  enqueueNotification,
  processNotificationQueue,
  resendNotification,
} from './whatsapp-notifications.server';
import { db } from '@/lib/db';
import * as evolutionModule from '@/lib/whatsapp/evolution';
import * as metaCloudModule from '@/lib/whatsapp-cloud.server';

vi.mock('@/lib/db', () => ({
  db: {
    notificationQueue: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    shop: {
      findUnique: vi.fn(),
    },
  },
}));

describe('WhatsApp Notifications Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatNotificationText', () => {
    it('formats ORDER_BOOKED customer message correctly with full payload', () => {
      const text = formatNotificationText('ORDER_BOOKED', {
        customerName: 'Aarav Sharma',
        orderRef: 'TEST-ORD-101',
        productName: '22K Gold Bangle',
        requiredByDate: '25 Sep 2026',
        orderUrl: 'https://example.com/orders/101',
        shopName: 'Shree Jewellers',
      });

      expect(text).toContain('Namaste Aarav Sharma!');
      expect(text).toContain('Shree Jewellers');
      expect(text).toContain('TEST-ORD-101');
      expect(text).toContain('22K Gold Bangle');
      expect(text).toContain('25 Sep 2026');
      expect(text).toContain('https://example.com/orders/101');
      expect(text).toContain('Dhanyawad!');
    });

    it('formats ORDER_BOOKED with minimal payload without throwing', () => {
      const text = formatNotificationText('ORDER_BOOKED', {});
      expect(text).toContain('Namaste');
      expect(text).toContain('Dhanyawad!');
    });

    it('formats ADMIN_NEW_ORDER_ALERT message correctly', () => {
      const text = formatNotificationText('ADMIN_NEW_ORDER_ALERT', {
        customerName: 'Priya Verma',
        customerPhone: '9876543210',
        orderRef: 'TEST-ORD-102',
        productName: 'Royal Diamond Necklace',
        adminOrderUrl: 'https://example.com/admin/orders/102',
      });

      expect(text).toContain('NEW ORDER ALERT');
      expect(text).toContain('Priya Verma');
      expect(text).toContain('9876543210');
      expect(text).toContain('TEST-ORD-102');
      expect(text).toContain('Royal Diamond Necklace');
      expect(text).toContain('https://example.com/admin/orders/102');
    });

    it('formats STATUS_CONFIRMED message correctly', () => {
      const text = formatNotificationText('STATUS_CONFIRMED', {
        customerName: 'Aarav Sharma',
        orderRef: 'TEST-ORD-103',
      });

      expect(text).toBe('Namaste Aarav Sharma! Aapka order #TEST-ORD-103 confirm ho gaya hai.');
    });

    it('formats STATUS_READY message correctly', () => {
      const text = formatNotificationText('STATUS_READY', {
        customerName: 'Aarav Sharma',
        orderRef: 'TEST-ORD-104',
      });

      expect(text).toBe(
        'Namaste Aarav Sharma! Aapka booked design #TEST-ORD-104 counter par visit karne ke liye ready hai!'
      );
    });

    it('formats STATUS_COMPLETED message correctly with shop name', () => {
      const text = formatNotificationText('STATUS_COMPLETED', {
        customerName: 'Aarav Sharma',
        orderRef: 'TEST-ORD-105',
        shopName: 'Shree Jewellers',
      });

      expect(text).toBe(
        'Namaste Aarav Sharma! Order #TEST-ORD-105 complete ho gaya hai. Shree Jewellers se shopping karne ke liye dhanyawad!'
      );
    });

    it('formats STATUS_COMPLETED message correctly without shop name', () => {
      const text = formatNotificationText('STATUS_COMPLETED', {
        customerName: 'Aarav Sharma',
        orderRef: 'TEST-ORD-105',
      });

      expect(text).toBe(
        'Namaste Aarav Sharma! Order #TEST-ORD-105 complete ho gaya hai. Shopping karne ke liye dhanyawad!'
      );
    });

    it('handles ORDER_STATUS_CHANGED with sub-statuses (CONFIRMED, READY, COMPLETED, OTHER)', () => {
      const confirmed = formatNotificationText('ORDER_STATUS_CHANGED', {
        status: 'CONFIRMED',
        customerName: 'Kavita Sen',
        orderRef: 'TEST-ORD-201',
      });
      expect(confirmed).toContain('confirm ho gaya hai');

      const ready = formatNotificationText('ORDER_STATUS_CHANGED', {
        status: 'READY',
        customerName: 'Kavita Sen',
        orderRef: 'TEST-ORD-201',
      });
      expect(ready).toContain('ready hai');

      const completed = formatNotificationText('ORDER_STATUS_CHANGED', {
        status: 'COMPLETED',
        customerName: 'Kavita Sen',
        orderRef: 'TEST-ORD-201',
      });
      expect(completed).toContain('complete ho gaya hai');

      const cancelled = formatNotificationText('ORDER_STATUS_CHANGED', {
        status: 'CANCELLED',
        customerName: 'Kavita Sen',
        orderRef: 'TEST-ORD-201',
      });
      expect(cancelled).toContain('CANCELLED');
    });

    it('falls back gracefully for unknown notification type', () => {
      const text = formatNotificationText('UNKNOWN_TYPE', {
        message: 'Custom broadcast message',
      });
      expect(text).toBe('Custom broadcast message');
    });
  });

  describe('enqueueNotification', () => {
    it('creates PENDING item in NotificationQueue with default channel EVOLUTION_API', async () => {
      vi.mocked(db.notificationQueue.create).mockResolvedValue({ id: 'queue-1' } as any);

      const result = await enqueueNotification({
        shopId: 'shop-1',
        type: 'ORDER_BOOKED',
        recipient: '9876543210',
        payload: { customerName: 'Aarav', orderRef: 'TEST-1' },
        orderId: 'ord-1',
        customerId: 'cust-1',
      });

      expect(result).toEqual({ id: 'queue-1' });
      expect(db.notificationQueue.create).toHaveBeenCalledWith({
        data: {
          shopId: 'shop-1',
          type: 'ORDER_BOOKED',
          recipient: '919876543210',
          payload: { customerName: 'Aarav', orderRef: 'TEST-1' },
          orderId: 'ord-1',
          customerId: 'cust-1',
          channel: 'EVOLUTION_API',
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 3,
        },
      });
    });

    it('respects custom channel such as META_CLOUD_API', async () => {
      vi.mocked(db.notificationQueue.create).mockResolvedValue({ id: 'queue-2' } as any);

      await enqueueNotification({
        shopId: 'shop-1',
        type: 'MARKETING_BROADCAST',
        recipient: '919876543210',
        payload: { templateName: 'diwali_offer' },
        channel: 'META_CLOUD_API',
      });

      expect(db.notificationQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel: 'META_CLOUD_API',
          orderId: null,
          customerId: null,
        }),
      });
    });
  });

  describe('processNotificationQueue', () => {
    const mockShop = {
      id: 'shop-1',
      name: 'Shree Jewellers',
      phone: '9876543210',
      evolutionApiUrl: 'http://localhost:8087',
      evolutionApiKey: 'evo-key',
      evolutionInstance: 'StoreInstance',
      metaPhoneNumberId: 'meta-phone-1',
      metaAccessToken: 'meta-token-1',
      metaWabaId: 'meta-waba-1',
    };

    it('returns zero counts when no pending items exist', async () => {
      vi.mocked(db.notificationQueue.findMany).mockResolvedValue([]);

      const res = await processNotificationQueue('shop-1');

      expect(res).toEqual({ processed: 0, delivered: 0, failed: 0 });
      expect(db.shop.findUnique).not.toHaveBeenCalled();
    });

    it('processes and delivers EVOLUTION_API notifications', async () => {
      const sendEvoSpy = vi
        .spyOn(evolutionModule, 'sendEvolutionApiMessage')
        .mockResolvedValue({ success: true } as any);

      vi.mocked(db.notificationQueue.findMany).mockResolvedValue([
        {
          id: 'queue-1',
          shopId: 'shop-1',
          type: 'ORDER_BOOKED',
          channel: 'EVOLUTION_API',
          recipient: '919876543210',
          payload: { customerName: 'Aarav', orderRef: 'PJ-1' },
          attempts: 0,
          maxAttempts: 3,
        } as any,
      ]);
      vi.mocked(db.shop.findUnique).mockResolvedValue(mockShop as any);
      vi.mocked(db.notificationQueue.update).mockResolvedValue({} as any);

      const res = await processNotificationQueue('shop-1');

      expect(res).toEqual({ processed: 1, delivered: 1, failed: 0 });
      expect(sendEvoSpy).toHaveBeenCalledWith(
        {
          evolutionApiUrl: 'http://localhost:8087',
          evolutionApiKey: 'evo-key',
          evolutionInstance: 'StoreInstance',
        },
        '919876543210',
        expect.stringContaining('Namaste Aarav!')
      );
      expect(db.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-1' },
        data: {
          status: 'DELIVERED',
          attempts: 1,
          lastError: null,
        },
      });

      sendEvoSpy.mockRestore();
    });

    it('processes and delivers META_CLOUD_API notifications', async () => {
      const sendMetaSpy = vi
        .spyOn(metaCloudModule, 'sendMetaCloudTemplateMessage')
        .mockResolvedValue({ messages: [{ id: 'wamid.123' }] } as any);

      vi.mocked(db.notificationQueue.findMany).mockResolvedValue([
        {
          id: 'queue-2',
          shopId: 'shop-1',
          type: 'ORDER_BOOKED',
          channel: 'META_CLOUD_API',
          recipient: '919876543210',
          payload: {
            templateName: 'order_booked_v1',
            languageCode: 'hi',
            parameters: ['Aarav', 'PJ-1'],
          },
          attempts: 0,
          maxAttempts: 3,
        } as any,
      ]);
      vi.mocked(db.shop.findUnique).mockResolvedValue(mockShop as any);
      vi.mocked(db.notificationQueue.update).mockResolvedValue({} as any);

      const res = await processNotificationQueue('shop-1');

      expect(res).toEqual({ processed: 1, delivered: 1, failed: 0 });
      expect(sendMetaSpy).toHaveBeenCalledWith({
        phoneNumberId: 'meta-phone-1',
        accessToken: 'meta-token-1',
        recipientPhone: '919876543210',
        templateName: 'order_booked_v1',
        languageCode: 'hi',
        parameters: ['Aarav', 'PJ-1'],
      });
      expect(db.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-2' },
        data: {
          status: 'DELIVERED',
          attempts: 1,
          lastError: null,
        },
      });

      sendMetaSpy.mockRestore();
    });

    it('retries with incremented attempts and stays PENDING if attempts < maxAttempts', async () => {
      const sendEvoSpy = vi
        .spyOn(evolutionModule, 'sendEvolutionApiMessage')
        .mockRejectedValue(new Error('Network connection timeout'));

      vi.mocked(db.notificationQueue.findMany).mockResolvedValue([
        {
          id: 'queue-3',
          shopId: 'shop-1',
          type: 'ORDER_BOOKED',
          channel: 'EVOLUTION_API',
          recipient: '919876543210',
          payload: { customerName: 'Aarav' },
          attempts: 1,
          maxAttempts: 3,
        } as any,
      ]);
      vi.mocked(db.shop.findUnique).mockResolvedValue(mockShop as any);
      vi.mocked(db.notificationQueue.update).mockResolvedValue({} as any);

      const res = await processNotificationQueue('shop-1');

      expect(res).toEqual({ processed: 1, delivered: 0, failed: 0 });
      expect(db.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-3' },
        data: {
          status: 'PENDING',
          attempts: 2,
          lastError: 'Network connection timeout',
        },
      });

      sendEvoSpy.mockRestore();
    });

    it('marks status as FAILED when attempts reaches maxAttempts', async () => {
      const sendEvoSpy = vi
        .spyOn(evolutionModule, 'sendEvolutionApiMessage')
        .mockRejectedValue(new Error('API key invalid'));

      vi.mocked(db.notificationQueue.findMany).mockResolvedValue([
        {
          id: 'queue-4',
          shopId: 'shop-1',
          type: 'ORDER_BOOKED',
          channel: 'EVOLUTION_API',
          recipient: '919876543210',
          payload: { customerName: 'Aarav' },
          attempts: 2,
          maxAttempts: 3,
        } as any,
      ]);
      vi.mocked(db.shop.findUnique).mockResolvedValue(mockShop as any);
      vi.mocked(db.notificationQueue.update).mockResolvedValue({} as any);

      const res = await processNotificationQueue('shop-1');

      expect(res).toEqual({ processed: 1, delivered: 0, failed: 1 });
      expect(db.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-4' },
        data: {
          status: 'FAILED',
          attempts: 3,
          lastError: 'API key invalid',
        },
      });

      sendEvoSpy.mockRestore();
    });
  });

  describe('resendNotification', () => {
    it('resets status to PENDING and attempts to 0, then triggers processNotificationQueue', async () => {
      vi.mocked(db.notificationQueue.update).mockResolvedValue({
        id: 'queue-99',
        shopId: 'shop-1',
      } as any);
      vi.mocked(db.notificationQueue.findMany).mockResolvedValue([]);

      const result = await resendNotification('queue-99');

      expect(db.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-99' },
        data: {
          status: 'PENDING',
          attempts: 0,
          lastError: null,
        },
      });
      expect(result).toEqual({ processed: 0, delivered: 0, failed: 0 });
    });
  });
});
