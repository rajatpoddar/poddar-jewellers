'use server';

import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { normalizePhone } from '@/lib/phone';
import { createOtpRecord, verifyOtpCode } from '@/lib/auth/otp';
import { sendWhatsAppOtp } from '@/lib/whatsapp/evolution';
import {
  createCustomerSessionCookie,
  syncWishlistToDatabase,
  clearCustomerSessionCookie,
} from '@/lib/auth/customer-session';

export async function requestOtpAction(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Kripya 10-digit mobile number enter karein.' };
    }

    const shop = await getShop();
    const otpCode = await createOtpRecord(shop.id, cleanPhone);
    const sendResult = await sendWhatsAppOtp(shop, cleanPhone, otpCode);

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error || 'OTP bhejane me samasya aayi. Dobara koshish karein.',
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OTP request fail ho gaya.';
    return { success: false, error: message };
  }
}

export async function verifyOtpAction(
  phone: string,
  otp: string,
  wishlistProductIds: string[] = []
): Promise<{ success: boolean; isNew?: boolean; error?: string }> {
  try {
    const cleanPhone = normalizePhone(phone);
    const shop = await getShop();

    const verifyResult = await verifyOtpCode(shop.id, cleanPhone, otp);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error || 'Galat OTP.' };
    }

    const customer = await db.customer.findFirst({
      where: {
        shopId: shop.id,
        phone: cleanPhone,
      },
    });

    if (customer) {
      await createCustomerSessionCookie(customer.id, shop.id);
      await syncWishlistToDatabase(customer.id, wishlistProductIds);
      return { success: true, isNew: false };
    } else {
      return { success: true, isNew: true };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OTP verify karne me error aaya.';
    return { success: false, error: message };
  }
}

export async function completeCustomerRegistrationAction(
  phone: string,
  name: string,
  addressLine1?: string,
  city?: string,
  pincode?: string,
  wishlistProductIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPhone = normalizePhone(phone);
    const shop = await getShop();

    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Kripya apna naam enter karein.' };
    }

    const customer = await db.customer.upsert({
      where: {
        shopId_phone: {
          shopId: shop.id,
          phone: cleanPhone,
        },
      },
      create: {
        shopId: shop.id,
        phone: cleanPhone,
        name: name.trim(),
        addressLine1: addressLine1?.trim() || null,
        city: city?.trim() || null,
        pincode: pincode?.trim() || null,
      },
      update: {
        name: name.trim(),
        addressLine1: addressLine1?.trim() || null,
        city: city?.trim() || null,
        pincode: pincode?.trim() || null,
      },
    });

    await createCustomerSessionCookie(customer.id, shop.id);
    await syncWishlistToDatabase(customer.id, wishlistProductIds);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration complete nahi ho paya.';
    return { success: false, error: message };
  }
}

export async function logoutCustomerAction(): Promise<{ success: boolean }> {
  await clearCustomerSessionCookie();
  return { success: true };
}
