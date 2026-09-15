import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import type { Customer } from '@prisma/client';

export const CUSTOMER_SESSION_COOKIE = 'customer_session';
const SESSION_DAYS = 30;

export interface CustomerTokenPayload {
  customerId: string;
  shopId: string;
}

function getSecret(customSecret?: string): Uint8Array {
  const value = customSecret || process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(value);
}

export async function signCustomerToken(
  payload: CustomerTokenPayload,
  secretKey?: string
): Promise<string> {
  return new SignJWT({ customerId: payload.customerId, shopId: payload.shopId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.customerId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret(secretKey));
}

export async function verifyCustomerToken(
  token: string,
  secretKey?: string
): Promise<CustomerTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(secretKey));
    if (typeof payload.customerId !== 'string' || typeof payload.shopId !== 'string') {
      return null;
    }
    return { customerId: payload.customerId, shopId: payload.shopId };
  } catch {
    return null;
  }
}

export async function createCustomerSessionCookie(
  customerId: string,
  shopId: string
): Promise<string> {
  const token = await signCustomerToken({ customerId, shopId });
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  try {
    await db.customerSession.create({
      data: {
        customerId,
        token,
        expiresAt,
      },
    });
  } catch {
    // Ignore error if session entry creation fails or exists
  }

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return token;
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyCustomerToken(token);
  if (!payload) return null;

  const customer = await db.customer.findUnique({
    where: { id: payload.customerId },
  });

  return customer;
}

export async function syncWishlistToDatabase(
  customerId: string,
  productIds: string[]
): Promise<void> {
  if (!productIds || productIds.length === 0) return;

  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) return;

  const uniqueProductIds = Array.from(new Set(productIds));

  for (const productId of uniqueProductIds) {
    try {
      await db.wishlistItem.upsert({
        where: {
          customerId_productId: {
            customerId,
            productId,
          },
        },
        create: {
          shopId: customer.shopId,
          customerId,
          productId,
        },
        update: {},
      });
    } catch {
      // Ignore if product does not exist or deletion conflict
    }
  }
}
