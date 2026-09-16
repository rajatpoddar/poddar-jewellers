import { db } from '@/lib/db';

export interface NavCategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children?: NavCategoryItem[];
}

/**
 * Fetches all categories for a shop and structures them into a 2-level hierarchy
 * (Top-level categories with sub-category children array).
 */
export async function getNavCategories(shopId: string): Promise<NavCategoryItem[]> {
  const categories = await db.category.findMany({
    where: { shopId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
    },
  });

  const parentMap = new Map<string, NavCategoryItem>();
  const topLevel: NavCategoryItem[] = [];

  // First pass: Collect top-level categories
  for (const cat of categories) {
    if (!cat.parentId) {
      const item: NavCategoryItem = { ...cat, children: [] };
      parentMap.set(cat.id, item);
      topLevel.push(item);
    }
  }

  // Second pass: Populate sub-categories into their parent
  for (const cat of categories) {
    if (cat.parentId && parentMap.has(cat.parentId)) {
      parentMap.get(cat.parentId)!.children!.push({ ...cat });
    }
  }

  return topLevel;
}
