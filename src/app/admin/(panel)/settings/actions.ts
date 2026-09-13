'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

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
