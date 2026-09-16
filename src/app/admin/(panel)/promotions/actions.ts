'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PromotionScope } from '@prisma/client';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { createPromotion, togglePromotionActive, deletePromotion } from '@/lib/promotions.server';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

export type PromotionActionState = {
  error?: string;
  success?: boolean;
};

const promotionSchema = z.object({
  name: z.string().trim().min(1, 'Promotion naam zaroori hai'),
  headline: z.string().trim().min(1, 'Headline zaroori hai'),
  badgeText: z.string().trim().min(1, 'Badge text zaroori hai'),
  makingDiscountPercent: z.coerce
    .number()
    .min(0, 'Discount 0% se kam nahi ho sakta')
    .max(100, 'Discount 100% se zyada nahi ho sakta'),
  scope: z.enum(['SHOP_WIDE', 'CATEGORY', 'PRODUCT']).default('SHOP_WIDE'),
  categoryId: z.string().optional().nullable(),
  startDate: z.string().min(1, 'Start date zaroori hai'),
  endDate: z.string().min(1, 'End date zaroori hai'),
});

export async function createPromotionAction(
  stateOrFormData: PromotionActionState | FormData,
  maybeFormData?: FormData
): Promise<PromotionActionState> {
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

  const shop = await getShop();

  const name = (formData.get('name') as string) || '';
  const headline = (formData.get('headline') as string) || '';
  const badgeText = (formData.get('badgeText') as string) || '';
  const rawDiscount = formData.get('makingDiscountPercent');
  const scope = (formData.get('scope') as PromotionScope) || 'SHOP_WIDE';
  const categoryId = (formData.get('categoryId') as string) || null;
  const productIds = formData.getAll('productIds').map(String).filter(Boolean);
  const startDateStr = (formData.get('startDate') as string) || '';
  const endDateStr = (formData.get('endDate') as string) || '';
  const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true' || formData.get('isActive') === null;

  const parsed = promotionSchema.safeParse({
    name,
    headline,
    badgeText,
    makingDiscountPercent: rawDiscount,
    scope,
    categoryId,
    startDate: startDateStr,
    endDate: endDateStr,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (scope === 'CATEGORY' && !categoryId) {
    return { error: 'Category select kijiye' };
  }

  if (scope === 'PRODUCT' && productIds.length === 0) {
    return { error: 'Kam se kam ek product select kijiye' };
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { error: 'Galat tarikh format' };
  }

  if (endDate <= startDate) {
    return { error: 'End date start date ke baad honi chahiye' };
  }

  const makingDiscountPercentBp = Math.round(parsed.data.makingDiscountPercent * 100);

  try {
    await createPromotion(shop.id, {
      name: parsed.data.name,
      headline: parsed.data.headline,
      badgeText: parsed.data.badgeText,
      makingDiscountPercentBp,
      scope: parsed.data.scope as PromotionScope,
      categoryId: scope === 'CATEGORY' ? categoryId : null,
      productIds: scope === 'PRODUCT' ? productIds : [],
      startDate,
      endDate,
      isActive,
    });

    await recomputeAllPriceCaches();
    revalidatePath('/admin/promotions');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Promotion create karne me error aaya',
    };
  }
}

export async function togglePromotionActiveAction(
  promotionId: string,
  isActive: boolean
): Promise<PromotionActionState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: 'Unauthorized' };
  }

  const shop = await getShop();

  try {
    await togglePromotionActive(promotionId, isActive, shop.id);
    await recomputeAllPriceCaches();
    revalidatePath('/admin/promotions');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Status change karne me error aaya',
    };
  }
}

export async function deletePromotionAction(promotionId: string): Promise<PromotionActionState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: 'Unauthorized' };
  }

  const shop = await getShop();

  try {
    await deletePromotion(promotionId, shop.id);
    await recomputeAllPriceCaches();
    revalidatePath('/admin/promotions');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Promotion delete karne me error aaya',
    };
  }
}
