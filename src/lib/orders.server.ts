import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import {
  getCurrentCustomer,
  createCustomerSessionCookie,
} from '@/lib/auth/customer-session';
import { sanitizeIndianPhone } from '@/lib/whatsapp/evolution';
import {
  createOrder,
  updateOrderStatus as updateOrderStatusEngine,
} from '@/lib/orders/engine';
import { logCustomerActivity } from '@/lib/crm/activity';
import { updateMarketingConsentLogic } from '@/lib/crm-consent-helpers';
import {
  enqueueNotification,
  processNotificationQueue,
} from '@/lib/whatsapp-notifications.server';
import type { OrderStatus } from '@prisma/client';

export interface CreateOrderBookingInput {
  productId: string;
  weightMg: number;
  requiredByDate?: string | null;
  customerNotes?: string | null;
  name?: string;
  phone?: string;
  marketingOptIn?: boolean;
}

export async function createOrderBooking(input: CreateOrderBookingInput): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    const shop = await getShop();
    let customer = await getCurrentCustomer();
    let customerId = customer?.id;

    if (!customerId) {
      if (!input.phone || !input.name || !input.name.trim()) {
        return {
          success: false,
          error: 'Kripya apna naam aur WhatsApp mobile number enter karein.',
        };
      }

      const cleanPhone = sanitizeIndianPhone(input.phone);
      if (!cleanPhone || cleanPhone.length < 10) {
        return {
          success: false,
          error: 'Kripya sahi 10-digit mobile number enter karein.',
        };
      }

      const optIn = input.marketingOptIn ?? true;
      const consent = updateMarketingConsentLogic(optIn, 'BOOKING_MODAL');

      const upsertedCustomer = await db.customer.upsert({
        where: {
          shopId_phone: {
            shopId: shop.id,
            phone: cleanPhone,
          },
        },
        create: {
          shopId: shop.id,
          phone: cleanPhone,
          name: input.name.trim(),
          marketingOptIn: consent.marketingOptIn,
          optInSource: consent.optInSource,
          optInAt: consent.optInAt,
        },
        update: {
          name: input.name.trim(),
          ...(input.marketingOptIn !== undefined
            ? {
                marketingOptIn: consent.marketingOptIn,
                optInSource: consent.optInSource,
                optInAt: consent.optInAt,
              }
            : {}),
        },
      });

      await createCustomerSessionCookie(upsertedCustomer.id, shop.id);
      customerId = upsertedCustomer.id;
    } else {
      // Existing customer session: if marketingOptIn is provided, update customer's consent fields
      if (input.marketingOptIn !== undefined) {
        const consent = updateMarketingConsentLogic(
          input.marketingOptIn,
          'BOOKING_MODAL'
        );
        await db.customer.update({
          where: { id: customerId },
          data: {
            marketingOptIn: consent.marketingOptIn,
            optInSource: consent.optInSource,
            optInAt: consent.optInAt,
          },
        });
      }
    }

    const order = await createOrder({
      shopId: shop.id,
      customerId,
      productId: input.productId,
      weightMg: input.weightMg,
      requiredByDate: input.requiredByDate ? new Date(input.requiredByDate) : null,
      customerNotes: input.customerNotes || null,
    });

    // Log customer activity
    await logCustomerActivity(shop.id, 'WHATSAPP_ENQUIRE', {
      customerId,
      productId: input.productId,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        requiredByDate: input.requiredByDate,
      },
    });

    // Enqueue automated WhatsApp notifications & admin alerts
    try {
      const customerName = order.customer?.name || input.name?.trim() || 'Grahak';
      const customerPhone = order.customer?.phone || input.phone || '';
      const productName = order.items?.[0]?.productName || 'Jewellery';
      const orderRef = order.orderNumber;
      const targetDate = input.requiredByDate || null;

      if (customerPhone) {
        // 1. Customer booking notification
        await enqueueNotification({
          shopId: shop.id,
          type: 'ORDER_BOOKED',
          recipient: customerPhone,
          payload: {
            customerName,
            orderRef,
            productName,
            requiredByDate: targetDate,
            orderUrl: '/orders',
          },
          orderId: order.id,
          customerId,
        });
      }

      if (shop.phone) {
        // 2. Shop Admin alert
        await enqueueNotification({
          shopId: shop.id,
          type: 'ADMIN_NEW_ORDER_ALERT',
          recipient: shop.phone,
          payload: {
            customerName,
            customerPhone,
            orderRef,
            productName,
            adminOrderUrl: '/admin/orders',
          },
          orderId: order.id,
          customerId,
        });
      }

      // Process queue asynchronously without stalling HTTP execution
      processNotificationQueue(shop.id).catch((err) => {
        console.error('Failed to process notification queue in background:', err);
      });
    } catch (queueErr) {
      console.error('Failed to enqueue order notifications:', queueErr);
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Order book karne me error aaya.';
    return { success: false, error: message };
  }
}

const NOTIFIABLE_STATUSES: OrderStatus[] = ['CONFIRMED', 'READY', 'COMPLETED'];

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const shop = await getShop();
    const updatedOrder = await updateOrderStatusEngine(orderId, status);

    if (NOTIFIABLE_STATUSES.includes(status)) {
      try {
        let customer = updatedOrder?.customer;
        let customerPhone = customer?.phone;
        let customerName = customer?.name || 'Grahak';
        let orderNumber = updatedOrder?.orderNumber;
        let customerId = updatedOrder?.customerId;

        if (!customerPhone && db.order?.findUnique) {
          const orderWithCustomer = await db.order.findUnique({
            where: { id: orderId },
            include: { customer: true },
          });
          if (orderWithCustomer?.customer) {
            customerPhone = orderWithCustomer.customer.phone;
            customerName = orderWithCustomer.customer.name || customerName;
            orderNumber = orderWithCustomer.orderNumber || orderNumber;
            customerId = orderWithCustomer.customerId || customerId;
          }
        }

        if (customerPhone) {
          await enqueueNotification({
            shopId: shop.id,
            type: 'ORDER_STATUS_CHANGED',
            recipient: customerPhone,
            payload: {
              customerName,
              orderRef: orderNumber || orderId,
              newStatus: status,
              status,
              orderUrl: '/orders',
            },
            orderId,
            customerId: customerId || undefined,
          });

          processNotificationQueue(shop.id).catch((err) => {
            console.error('Failed to process notification queue on status update:', err);
          });
        }
      } catch (queueErr) {
        console.error('Failed to enqueue order status change notification:', queueErr);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Order status update fail ho gaya.';
    return { success: false, error: message };
  }
}

export const updateOrderStatusServer = updateOrderStatus;

