import { db } from '@/lib/db';
import { ActivityType } from '@prisma/client';

export interface LogActivityParams {
  customerId?: string | null;
  sessionId?: string | null;
  productId?: string | null;
  metadata?: Record<string, unknown> | string | null;
}

/**
 * Inserts a CustomerActivity record in db.customerActivity.
 */
export async function logCustomerActivity(
  shopId: string,
  eventType: ActivityType,
  params: LogActivityParams = {}
) {
  const metadataString = params.metadata
    ? typeof params.metadata === 'string'
      ? params.metadata
      : JSON.stringify(params.metadata)
    : null;

  return await db.customerActivity.create({
    data: {
      shopId,
      eventType,
      customerId: params.customerId || null,
      sessionId: params.sessionId || null,
      productId: params.productId || null,
      metadata: metadataString,
    },
  });
}
