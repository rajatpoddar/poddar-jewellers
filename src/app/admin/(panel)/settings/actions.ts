'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

import { getCurrentAdmin } from '@/auth/session';
import { validateMetaSettings } from '@/components/admin/meta-settings-helpers';

const percentToBp = z.coerce.number().min(0).max(100).transform((n) => Math.round(n * 100));
const rupeesToPaiseField = z.coerce.number().positive().transform((n) => Math.round(n * 100));
const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour #RRGGBB me likhiye');
const optional = z.string().optional();

const settingsSchema = z.object({
  name: z.string().trim().min(1),
  tagline: optional,
  brandPrimary: hexColour,
  brandInk: hexColour,
  brandGround: hexColour,
  fontDisplay: z.string().trim().min(1),
  fontBody: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  whatsapp: z.string().trim().min(1),
  email: z.string().email(),
  addressLine1: z.string().trim().min(1),
  addressLine2: optional,
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().min(1),
  mapUrl: optional,
  hoursText: z.string().trim().min(1),
  instagramUrl: optional,
  facebookUrl: optional,
  defaultMakingPercentBp: percentToBp,
  gstPercentBp: percentToBp,
  roundingStepPaise: rupeesToPaiseField,
  roundingSmallStepPaise: rupeesToPaiseField,
  roundingThresholdPaise: rupeesToPaiseField,
  priceDisclaimer: z.string().trim().min(1),
  rateWarnHours: z.coerce.number().int().positive(),
  rateStaleHours: z.coerce.number().int().positive(),
  rateBannerText: z.string().trim().min(1),
  heroHeading: z.string().trim().min(1),
  heroSubheading: z.string().trim().min(1),
  seoLocations: z.string().trim().min(1),
});

export type SaveSettingsState = { error?: string; saved?: boolean };

export async function saveSettings(
  _prev: SaveSettingsState,
  formData: FormData,
): Promise<SaveSettingsState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join('.')}: ${issue.message}` };
  }
  if (parsed.data.rateStaleHours <= parsed.data.rateWarnHours) {
    return { error: 'Banner ke ghante warning ke ghanton se zyada hone chahiye.' };
  }

  const shop = await getShop();
  await db.shop.update({
    where: { id: shop.id },
    data: {
      ...parsed.data,
      tagline: parsed.data.tagline || null,
      addressLine2: parsed.data.addressLine2 || null,
      mapUrl: parsed.data.mapUrl || null,
      instagramUrl: parsed.data.instagramUrl || null,
      facebookUrl: parsed.data.facebookUrl || null,
    },
  });

  // The making default, GST and the rounding steps all feed the price engine.
  await recomputeAllPriceCaches();
  revalidatePath('/', 'layout');
  return { saved: true };
}

export type UpdateMetaSettingsState = {
  error?: string;
  saved?: boolean;
};

export async function updateMetaSettingsAction(
  stateOrFormData: UpdateMetaSettingsState | FormData,
  maybeFormData?: FormData,
): Promise<UpdateMetaSettingsState> {
  const formData =
    maybeFormData instanceof FormData
      ? maybeFormData
      : stateOrFormData instanceof FormData
        ? stateOrFormData
        : new FormData();

  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: 'Unauthorized' };
  }

  const rawPhone = formData.get('metaPhoneNumberId') as string | null;
  const rawToken = formData.get('metaAccessToken') as string | null;
  const rawWaba = formData.get('metaWabaId') as string | null;

  const validation = validateMetaSettings({
    metaPhoneNumberId: rawPhone,
    metaAccessToken: rawToken,
    metaWabaId: rawWaba,
  });

  if (!validation.valid || !validation.data) {
    return { error: validation.error || 'Meta credentials theek nahi hain.' };
  }

  const shop = await getShop();
  await db.shop.update({
    where: { id: shop.id },
    data: {
      metaPhoneNumberId: validation.data.metaPhoneNumberId,
      metaAccessToken: validation.data.metaAccessToken,
      metaWabaId: validation.data.metaWabaId,
    },
  });

  revalidatePath('/admin/settings');
  return { saved: true };
}

export interface TestMetaConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    id?: string;
  };
}

export async function testMetaApiConnectionAction(
  input?: FormData | { phoneNumberId?: string; accessToken?: string; wabaId?: string },
): Promise<TestMetaConnectionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: 'Unauthorized' };
  }

  let phone: string | null = null;
  let token: string | null = null;

  if (input instanceof FormData) {
    phone = (input.get('metaPhoneNumberId') as string | null)?.trim() || null;
    token = (input.get('metaAccessToken') as string | null)?.trim() || null;
  } else if (input && typeof input === 'object') {
    phone = input.phoneNumberId?.trim() || null;
    token = input.accessToken?.trim() || null;
  }

  // Fallback to saved shop credentials if not provided in input
  if (!phone || !token) {
    const shop = await getShop();
    phone = phone || shop.metaPhoneNumberId;
    token = token || shop.metaAccessToken;
  }

  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  if (!phone || !token) {
    return {
      success: false,
      error: 'Meta Phone Number ID aur Access Token dono aavashyak hain testing ke liye.',
    };
  }

  if (!/^\d+$/.test(phone)) {
    return {
      success: false,
      error: 'Phone Number ID sirf anko (digits) me hona chahiye.',
    };
  }

  const url = `https://graph.facebook.com/v19.0/${phone}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Meta API error (${res.status})`;
      return {
        success: false,
        error: errorMsg,
      };
    }

    const verifiedText = [
      data.display_phone_number ? `Number: ${data.display_phone_number}` : '',
      data.verified_name ? `(${data.verified_name})` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      success: true,
      message: `Meta API v19.0 connection safal raha! ${verifiedText}`.trim(),
      details: {
        verifiedName: data.verified_name,
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating,
        id: data.id,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Meta API se connect karte samay error aaya.',
    };
  }
}

