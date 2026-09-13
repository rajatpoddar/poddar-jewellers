'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "" means inherit. A real number becomes basis points. */
function toBp(value: string | null | undefined): number | null {
  const raw = (value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error('Making charge 0 se 100 ke beech hona chahiye');
  }
  return Math.round(n * 100);
}

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Naam zaroori hai'),
  parentId: z.string().optional().transform((v) => (v ? v : null)),
});

export type CategoryState = { error?: string };

export async function createCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    parentId: formData.get('parentId'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const shop = await getShop();
  const slug = slugify(parsed.data.name);
  if (!slug) return { error: 'Naam me kam se kam ek akshar ya number hona chahiye.' };

  const clash = await db.category.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } });
  if (clash) return { error: `"${parsed.data.name}" pehle se hai.` };

  try {
    await db.category.create({
      data: {
        shopId: shop.id,
        name: parsed.data.name,
        slug,
        parentId: parsed.data.parentId,
        makingPercentBp: toBp(formData.get('makingPercent') as string | null),
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Category save nahi hui' };
  }

  await recomputeAllPriceCaches();
  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
  return {};
}

export async function updateCategory(id: string, formData: FormData) {
  let makingPercentBp: number | null;
  try {
    makingPercentBp = toBp(formData.get('makingPercent') as string | null);
  } catch (e) {
    redirect('/admin/categories?error=' + encodeURIComponent(e instanceof Error ? e.message : 'Galat value'));
  }

  await db.category.update({
    where: { id },
    data: { name: String(formData.get('name') ?? '').trim(), makingPercentBp },
  });

  // A category's making override feeds the engine for every product under it.
  await recomputeAllPriceCaches();
  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
}

export async function deleteCategory(id: string) {
  const [productCount, childCount] = await Promise.all([
    db.product.count({ where: { categoryId: id } }),
    db.category.count({ where: { parentId: id } }),
  ]);

  if (productCount > 0) {
    redirect('/admin/categories?error=' + encodeURIComponent(`Is category me ${productCount} product hain. Pehle unhe hataiye.`));
  }
  if (childCount > 0) {
    redirect('/admin/categories?error=' + encodeURIComponent(`Is category ke andar ${childCount} aur category hain.`));
  }

  await db.category.delete({ where: { id } });
  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
}
