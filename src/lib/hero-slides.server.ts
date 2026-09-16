import { db } from '@/lib/db';

export interface CreateHeroSlideInput {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  promotionId?: string | null;
}

/**
 * Returns active hero slides for storefront display, ordered by sortOrder asc.
 * Filters by isActive: true and date range if specified (startDate <= now and endDate >= now).
 * Includes linked Promotion data if attached.
 */
export async function getActiveHeroSlides(shopId: string, now: Date = new Date()) {
  try {
    return await db.heroSlide.findMany({
      where: {
        shopId,
        isActive: true,
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: now } }],
          },
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        ],
      },
      include: {
        promotion: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  } catch {
    return [];
  }
}


/**
 * Returns all hero slides for a given shop for admin management, ordered by sortOrder asc.
 * Includes linked Promotion data if attached.
 */
export async function getAllHeroSlides(shopId: string) {
  return db.heroSlide.findMany({
    where: { shopId },
    include: {
      promotion: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Creates a new hero slide for a shop.
 */
export async function createHeroSlide(
  shopId: string,
  input: CreateHeroSlideInput
) {
  const startDate = input.startDate
    ? typeof input.startDate === 'string'
      ? new Date(input.startDate)
      : input.startDate
    : null;

  const endDate = input.endDate
    ? typeof input.endDate === 'string'
      ? new Date(input.endDate)
      : input.endDate
    : null;

  return db.heroSlide.create({
    data: {
      shopId,
      title: input.title,
      subtitle: input.subtitle ?? null,
      imageUrl: input.imageUrl,
      mobileImageUrl: input.mobileImageUrl ?? null,
      ctaText: input.ctaText ?? null,
      ctaUrl: input.ctaUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      startDate,
      endDate,
      promotionId: input.promotionId ?? null,
    },
    include: {
      promotion: true,
    },
  });
}

/**
 * Reorders hero slides in batch using a transaction.
 * Updates sortOrder to match the position index in slideIds.
 */
export async function reorderHeroSlides(shopId: string, slideIds: string[]) {
  const updates = slideIds.map((id, index) =>
    db.heroSlide.updateMany({
      where: { id, shopId },
      data: { sortOrder: index },
    })
  );
  return db.$transaction(updates);
}

/**
 * Deletes a hero slide by id (and optional shopId for scoped deletion).
 */
export async function deleteHeroSlide(id: string, shopId?: string) {
  if (shopId) {
    return db.heroSlide.deleteMany({
      where: { id, shopId },
    });
  }
  return db.heroSlide.delete({
    where: { id },
  });
}
