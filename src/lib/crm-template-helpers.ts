import type { Prisma } from '@prisma/client';

export interface TemplateVariables {
  customerName?: string | null;
  shopName?: string;
  shopPhone?: string;
  wishlistCategory?: string | null;
}

/**
 * Interpolates template placeholder tags with provided variables.
 * Supported variables:
 * - {{CustomerName}} -> Defaults to "Grahak" if missing or blank
 * - {{ShopName}} -> Shop's business name
 * - {{ShopPhone}} -> Shop's phone number
 * - {{WishlistCategory}} -> Customer's preferred/wishlisted category (defaults to "Jewellery")
 */
export function interpolateTemplateVariables(
  templateText: string,
  vars: TemplateVariables
): string {
  if (!templateText) return '';

  const name =
    vars.customerName && vars.customerName.trim() !== ''
      ? vars.customerName.trim()
      : 'Grahak';
  const shopName = vars.shopName ? vars.shopName.trim() : '';
  const shopPhone = vars.shopPhone ? vars.shopPhone.trim() : '';
  const category =
    vars.wishlistCategory && vars.wishlistCategory.trim() !== ''
      ? vars.wishlistCategory.trim()
      : 'Jewellery';

  return templateText
    .replace(/\{\{\s*CustomerName\s*\}\}/gi, name)
    .replace(/\{\{\s*ShopName\s*\}\}/gi, shopName)
    .replace(/\{\{\s*ShopPhone\s*\}\}/gi, shopPhone)
    .replace(/\{\{\s*WishlistCategory\s*\}\}/gi, category);
}

export interface CustomerFilterInput {
  optIn?: boolean;
  tagId?: string;
  categorySlug?: string;
  eventWithinDays?: number;
  search?: string;
}

/**
 * Constructs a Prisma CustomerWhereInput query object based on filter criteria.
 */
export function buildCustomerFilterQuery(
  filters: CustomerFilterInput,
  shopId: string,
  now: Date = new Date()
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    shopId,
  };

  if (typeof filters.optIn === 'boolean') {
    where.marketingOptIn = filters.optIn;
  }

  if (filters.tagId && filters.tagId.trim() !== '') {
    where.tags = {
      some: {
        id: filters.tagId.trim(),
      },
    };
  }

  const andConditions: Prisma.CustomerWhereInput[] = [];

  if (filters.search && filters.search.trim() !== '') {
    const q = filters.search.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    });
  }

  if (filters.categorySlug && filters.categorySlug.trim() !== '') {
    const slug = filters.categorySlug.trim();
    andConditions.push({
      OR: [
        { wishlist: { some: { product: { category: { slug } } } } },
        { activities: { some: { product: { category: { slug } } } } },
      ],
    });
  }

  if (filters.eventWithinDays !== undefined && filters.eventWithinDays > 0) {
    const targetDate = new Date(
      now.getTime() + filters.eventWithinDays * 24 * 60 * 60 * 1000
    );
    andConditions.push({
      orders: {
        some: {
          requiredByDate: {
            gte: now,
            lte: targetDate,
          },
        },
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
