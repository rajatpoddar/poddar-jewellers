'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { createHeroSlide, deleteHeroSlide, reorderHeroSlides } from '@/lib/hero-slides.server';

export type CarouselActionState = {
  error?: string;
  success?: boolean;
};

const heroSlideSchema = z.object({
  title: z.string().trim().min(1, 'Title zaroori hai'),
  subtitle: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().min(1, 'Desktop image URL zaroori hai'),
  mobileImageUrl: z.string().trim().optional().nullable(),
  ctaText: z.string().trim().optional().nullable(),
  ctaUrl: z.string().trim().optional().nullable(),
  promotionId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  sortOrder: z.coerce.number().optional().default(0),
});

export async function createHeroSlideAction(
  stateOrFormData: CarouselActionState | FormData,
  maybeFormData?: FormData
): Promise<CarouselActionState> {
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

  const title = (formData.get('title') as string) || '';
  const subtitle = (formData.get('subtitle') as string) || null;
  const imageUrl = (formData.get('imageUrl') as string) || '';
  const mobileImageUrl = (formData.get('mobileImageUrl') as string) || null;
  const ctaText = (formData.get('ctaText') as string) || null;
  const ctaUrl = (formData.get('ctaUrl') as string) || null;
  const promotionId = (formData.get('promotionId') as string) || null;
  const startDateStr = (formData.get('startDate') as string) || null;
  const endDateStr = (formData.get('endDate') as string) || null;
  const sortOrderRaw = formData.get('sortOrder');

  const parsed = heroSlideSchema.safeParse({
    title,
    subtitle,
    imageUrl,
    mobileImageUrl,
    ctaText,
    ctaUrl,
    promotionId,
    startDate: startDateStr,
    endDate: endDateStr,
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  try {
    await createHeroSlide(shop.id, {
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      imageUrl: parsed.data.imageUrl,
      mobileImageUrl: parsed.data.mobileImageUrl || null,
      ctaText: parsed.data.ctaText || null,
      ctaUrl: parsed.data.ctaUrl || null,
      promotionId: parsed.data.promotionId || null,
      startDate,
      endDate,
      sortOrder: parsed.data.sortOrder,
      isActive: true,
    });

    revalidatePath('/admin/carousel');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Hero slide create karne me error aaya',
    };
  }
}

export async function deleteHeroSlideAction(id: string): Promise<CarouselActionState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: 'Unauthorized' };
  }

  const shop = await getShop();

  try {
    await deleteHeroSlide(id, shop.id);
    revalidatePath('/admin/carousel');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Slide delete karne me error aaya',
    };
  }
}

export async function reorderHeroSlidesAction(slideIds: string[]): Promise<CarouselActionState> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { error: 'Unauthorized' };
  }

  const shop = await getShop();

  try {
    await reorderHeroSlides(shop.id, slideIds);
    revalidatePath('/admin/carousel');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : 'Slides reorder karne me error aaya',
    };
  }
}
