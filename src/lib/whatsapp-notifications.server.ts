import { db } from '@/lib/db';
import { formatEvolutionPhone } from '@/lib/phone';
import {
  sendEvolutionApiMessage,
  type EvolutionShopConfig,
} from '@/lib/whatsapp/evolution';
import { sendMetaCloudTemplateMessage } from '@/lib/whatsapp-cloud.server';

export { sendEvolutionApiMessage };

export interface EnqueueNotificationOptions {
  shopId: string;
  type: string;
  recipient: string;
  payload: Record<string, any>;
  orderId?: string;
  customerId?: string;
  channel?: string;
}

export interface ProcessQueueResult {
  processed: number;
  delivered: number;
  failed: number;
}

/**
 * Formats user-facing Hinglish messages for transactional WhatsApp notifications.
 * Strictly adheres to Hard Rule 7 (no hardcoded shop facts): shop names, numbers,
 * and URLs are passed dynamically via the payload or Shop record.
 */
export function formatNotificationText(
  type: string,
  payload: Record<string, any>
): string {
  const customerName = payload.customerName || 'Grahak';
  const orderRef = payload.orderRef || '';
  const productName = payload.productName || 'Jewellery';
  const shopName = payload.shopName;

  switch (type) {
    case 'ORDER_BOOKED': {
      const shopPrefix = shopName ? `${shopName} par ` : '';
      const targetDate = payload.requiredByDate
        ? `\n\u{1F4C5} Target Date: ${payload.requiredByDate}`
        : '';
      const orderLink = payload.orderUrl
        ? `\n\nAapke order ka status dekhne ke liye yahan click karein: ${payload.orderUrl}`
        : '';
      return `Namaste ${customerName}! ${shopPrefix}aapka design booking receive ho gaya hai.\n\n\u{1F4CC} Booking Ref: #${orderRef}\n\u{1F48D} Item: ${productName}${targetDate}${orderLink}\n\nDhanyawad!`.trim();
    }

    case 'ADMIN_NEW_ORDER_ALERT': {
      const phone = payload.customerPhone || '';
      const adminLink = payload.adminOrderUrl
        ? `\n\nAdmin Order Dashboard: ${payload.adminOrderUrl}`
        : '';
      return `\u{1F514} NEW ORDER ALERT!\nCustomer ${customerName} (${phone}) ne naya design book kiya hai.\n\n\u{1F4CC} Ref: #${orderRef}\n\u{1F48D} Item: ${productName}${adminLink}`.trim();
    }

    case 'STATUS_CONFIRMED':
      return `Namaste ${customerName}! Aapka order #${orderRef} confirm ho gaya hai.`;

    case 'STATUS_READY':
      return `Namaste ${customerName}! Aapka booked design #${orderRef} counter par visit karne ke liye ready hai!`;

    case 'STATUS_COMPLETED': {
      const thankYou = shopName
        ? `${shopName} se shopping karne ke liye dhanyawad!`
        : 'Shopping karne ke liye dhanyawad!';
      return `Namaste ${customerName}! Order #${orderRef} complete ho gaya hai. ${thankYou}`.trim();
    }

    case 'ORDER_STATUS_CHANGED': {
      const status = (payload.status || '').toUpperCase();
      if (status === 'CONFIRMED') {
        return `Namaste ${customerName}! Aapka order #${orderRef} confirm ho gaya hai.`;
      }
      if (status === 'READY') {
        return `Namaste ${customerName}! Aapka booked design #${orderRef} counter par visit karne ke liye ready hai!`;
      }
      if (status === 'COMPLETED') {
        const thankYou = shopName
          ? `${shopName} se shopping karne ke liye dhanyawad!`
          : 'Shopping karne ke liye dhanyawad!';
        return `Namaste ${customerName}! Order #${orderRef} complete ho gaya hai. ${thankYou}`.trim();
      }
      return `Namaste ${customerName}! Aapke order #${orderRef} ka status update ho gaya hai: ${status}.`;
    }

    default:
      return payload.message || payload.text || '';
  }
}

/**
 * Enqueues a notification into the NotificationQueue table with status PENDING.
 */
export async function enqueueNotification(
  options: EnqueueNotificationOptions
) {
  const {
    shopId,
    type,
    recipient,
    payload,
    orderId,
    customerId,
    channel = 'EVOLUTION_API',
  } = options;

  const formattedRecipient = formatEvolutionPhone(recipient) || recipient;

  return await db.notificationQueue.create({
    data: {
      shopId,
      type,
      recipient: formattedRecipient,
      payload,
      orderId: orderId ?? null,
      customerId: customerId ?? null,
      channel,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
    },
  });
}

/**
 * Asynchronously processes all PENDING notification queue records for a shop.
 * Handles dispatching via Evolution API or Meta Cloud API, increments retry attempts,
 * and sets status to DELIVERED or FAILED (after maxAttempts).
 */
export async function processNotificationQueue(
  shopId: string
): Promise<ProcessQueueResult> {
  const pendingItems = await db.notificationQueue.findMany({
    where: {
      shopId,
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (pendingItems.length === 0) {
    return { processed: 0, delivered: 0, failed: 0 };
  }

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      phone: true,
      evolutionApiUrl: true,
      evolutionApiKey: true,
      evolutionInstance: true,
      metaPhoneNumberId: true,
      metaAccessToken: true,
      metaWabaId: true,
    },
  });

  let deliveredCount = 0;
  let failedCount = 0;

  for (const item of pendingItems) {
    const nextAttempts = item.attempts + 1;
    const payload = (
      item.payload && typeof item.payload === 'object' ? item.payload : {}
    ) as Record<string, any>;

    try {
      if (item.channel === 'META_CLOUD_API') {
        if (!shop?.metaPhoneNumberId || !shop?.metaAccessToken) {
          throw new Error('Meta Cloud API credentials missing on Shop');
        }

        await sendMetaCloudTemplateMessage({
          phoneNumberId: shop.metaPhoneNumberId,
          accessToken: shop.metaAccessToken,
          recipientPhone: item.recipient,
          templateName: (payload.templateName as string) || item.type.toLowerCase(),
          languageCode: (payload.languageCode as string) || 'hi',
          parameters: (payload.parameters as string[]) || [],
        });
      } else {
        // Default: EVOLUTION_API
        if (!shop?.evolutionApiUrl || !shop?.evolutionInstance) {
          throw new Error('Evolution API configuration missing on Shop');
        }

        const messageText = formatNotificationText(item.type, {
          shopName: shop.name,
          ...payload,
        });

        await sendEvolutionApiMessage(
          {
            evolutionApiUrl: shop.evolutionApiUrl,
            evolutionApiKey: shop.evolutionApiKey,
            evolutionInstance: shop.evolutionInstance,
          },
          item.recipient,
          messageText
        );
      }

      await db.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: 'DELIVERED',
          attempts: nextAttempts,
          lastError: null,
        },
      });
      deliveredCount++;
    } catch (err: any) {
      const isFailed = nextAttempts >= item.maxAttempts;
      await db.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: isFailed ? 'FAILED' : 'PENDING',
          attempts: nextAttempts,
          lastError: err?.message || String(err),
        },
      });
      if (isFailed) {
        failedCount++;
      }
    }
  }

  return {
    processed: pendingItems.length,
    delivered: deliveredCount,
    failed: failedCount,
  };
}

/**
 * Resets a notification queue item to PENDING with attempts = 0 and re-triggers queue processing.
 */
export async function resendNotification(
  queueId: string
): Promise<ProcessQueueResult> {
  const item = await db.notificationQueue.update({
    where: { id: queueId },
    data: {
      status: 'PENDING',
      attempts: 0,
      lastError: null,
    },
  });

  return await processNotificationQueue(item.shopId);
}
