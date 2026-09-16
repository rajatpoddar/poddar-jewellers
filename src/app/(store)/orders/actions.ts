'use server';

import {
  createOrderBooking,
  updateOrderStatusServer,
  type CreateOrderBookingInput,
} from '@/lib/orders.server';
import type { OrderStatus } from '@prisma/client';

export type BookOrderInput = CreateOrderBookingInput;
export { createOrderBooking };

export async function bookOrderAction(input: BookOrderInput): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  return createOrderBooking(input);
}

export async function updateOrderStatusAdminAction(
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  return updateOrderStatusServer(orderId, status);
}
