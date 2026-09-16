import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { normalizePhone } from '@/lib/phone';
import {
  createCustomerSessionCookie,
  syncWishlistToDatabase,
} from '@/lib/auth/customer-session';
import { updateMarketingConsentLogic } from '@/lib/crm-consent-helpers';

export interface RegisterCustomerProfileInput {
  phone: string;
  name: string;
  addressLine1?: string;
  city?: string;
  pincode?: string;
  wishlistProductIds?: string[];
  marketingOptIn?: boolean;
}

export async function registerCustomerProfile(
  phoneOrInput: string | RegisterCustomerProfileInput,
  name?: string,
  addressLine1?: string,
  city?: string,
  pincode?: string,
  wishlistProductIds: string[] = [],
  marketingOptIn?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const input: RegisterCustomerProfileInput =
      typeof phoneOrInput === 'string'
        ? {
            phone: phoneOrInput,
            name: name ?? '',
            addressLine1,
            city,
            pincode,
            wishlistProductIds,
            marketingOptIn,
          }
        : phoneOrInput;

    const cleanPhone = normalizePhone(input.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Kripya 10-digit mobile number enter karein.' };
    }

    const shop = await getShop();

    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: 'Kripya apna naam enter karein.' };
    }

    const optIn = input.marketingOptIn ?? true;
    const consent = updateMarketingConsentLogic(optIn, 'LOGIN_MODAL');

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
        name: input.name.trim(),
        addressLine1: input.addressLine1?.trim() || null,
        city: input.city?.trim() || null,
        pincode: input.pincode?.trim() || null,
        marketingOptIn: consent.marketingOptIn,
        optInSource: consent.optInSource,
        optInAt: consent.optInAt,
      },
      update: {
        name: input.name.trim(),
        addressLine1: input.addressLine1?.trim() || null,
        city: input.city?.trim() || null,
        pincode: input.pincode?.trim() || null,
        marketingOptIn: consent.marketingOptIn,
        optInSource: consent.optInSource,
        optInAt: consent.optInAt,
      },
    });

    await createCustomerSessionCookie(customer.id, shop.id);
    await syncWishlistToDatabase(customer.id, input.wishlistProductIds || []);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration complete nahi ho paya.';
    return { success: false, error: message };
  }
}
