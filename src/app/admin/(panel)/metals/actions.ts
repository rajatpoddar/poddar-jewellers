'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const metalSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key zaroori hai')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key sirf BADE akshar, number aur _ me likhiye, jaise SILVER_925'),
  label: z.string().trim().min(1, 'Label zaroori hai'),
});

export type MetalState = { error?: string };

export async function createMetalType(_prev: MetalState, formData: FormData): Promise<MetalState> {
  const parsed = metalSchema.safeParse({ key: formData.get('key'), label: formData.get('label') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const shop = await getShop();
  const existing = await db.metalType.findUnique({
    where: { shopId_key: { shopId: shop.id, key: parsed.data.key } },
  });
  if (existing) return { error: `"${parsed.data.key}" pehle se maujood hai.` };

  const count = await db.metalType.count({ where: { shopId: shop.id } });
  await db.metalType.create({
    data: { shopId: shop.id, key: parsed.data.key, label: parsed.data.label, sortOrder: count },
  });

  revalidatePath('/admin/metals');
  revalidatePath('/admin');
  return {};
}

/** The key is deliberately not editable: products and rate history point at it. */
export async function updateMetalType(id: string, formData: FormData) {
  const label = String(formData.get('label') ?? '').trim();
  if (!label) redirect('/admin/metals?error=' + encodeURIComponent('Label khaali nahi ho sakta.'));

  await db.metalType.update({ where: { id }, data: { label } });
  revalidatePath('/admin/metals');
  revalidatePath('/admin');
}

/**
 * Deactivated, never deleted. Rate history and existing products still reference
 * it; removing the row would erase what past prices were computed from.
 *
 * Failures redirect with a message rather than throwing — this admin is going to
 * be handed to a non-technical user, and a stack trace is not an answer.
 */
export async function deactivateMetalType(id: string) {
  const inUse = await db.product.count({ where: { metalTypeId: id } });
  if (inUse > 0) {
    redirect(
      '/admin/metals?error=' +
        encodeURIComponent(`${inUse} product is metal type par hain. Pehle unhe badaliye.`),
    );
  }

  await db.metalType.update({ where: { id }, data: { isActive: false } });
  await recomputeAllPriceCaches();
  revalidatePath('/admin/metals');
  revalidatePath('/admin');
}

export async function reactivateMetalType(id: string) {
  await db.metalType.update({ where: { id }, data: { isActive: true } });
  revalidatePath('/admin/metals');
  revalidatePath('/admin');
}
