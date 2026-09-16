import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import {
  getCurrentCustomer,
  createCustomerSessionCookie,
} from '@/lib/auth/customer-session';
import { sanitizeIndianPhone } from '@/lib/whatsapp/evolution';
import { createOrder, updateOrderStatus } from '@/lib/orders/engine';
import { logCustomerActivity } from '@/lib/crm/activity';
import { updateMarketingConsentLogic } from '@/lib/crm-consent-helpers';
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

export async function updateOrderStatusServer(
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateOrderStatus(orderId, status);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Order status update fail ho gaya.';
    return { success: false, error: message };
  }
}
