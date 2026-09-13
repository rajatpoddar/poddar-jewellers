'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import path from 'node:path';
import { db } from '@/lib/db';
import { rupeesToPaise } from '@/lib/money';
import { parseWeights } from '@/lib/weights';
import { processUpload } from '@/lib/images';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product ka naam zaroori hai'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category chuniye'),
  metalTypeId: z.string().min(1, 'Metal type chuniye'),
  status: z.enum(['DRAFT', 'LIVE']),
  featured: z.coerce.boolean(),
  stoneValue: z.coerce.number().min(0).default(0),
  stoneDescription: z.string().optional(),
  weights: z.string().min(1, 'Kam se kam ek weight daaliye'),
});

export type SaveProductState = { error?: string };

export async function saveProduct(
  id: string | null,
  _prev: SaveProductState,
  formData: FormData,
): Promise<SaveProductState> {
  const shop = await getShop();

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    categoryId: formData.get('categoryId'),
    metalTypeId: formData.get('metalTypeId'),
    status: formData.get('status'),
    featured: formData.get('featured') === 'on',
    stoneValue: formData.get('stoneValue') || 0,
    stoneDescription: formData.get('stoneDescription'),
    weights: formData.get('weights'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let weightsMg: number[];
  try {
    weightsMg = parseWeights(parsed.data.weights);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Weight galat hai' };
  }

  const makingRaw = String(formData.get('makingPercent') ?? '').trim();
  let makingPercentBp: number | null = null;
  if (makingRaw !== '') {
    const n = Number(makingRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: 'Making charge 0 se 100 ke beech hona chahiye' };
    }
    makingPercentBp = Math.round(n * 100);
  }

  // Both belong to this shop — never trust an id that arrived in a form.
  const [category, metalType] = await Promise.all([
    db.category.findFirst({ where: { id: parsed.data.categoryId, shopId: shop.id } }),
    db.metalType.findFirst({ where: { id: parsed.data.metalTypeId, shopId: shop.id } }),
  ]);
  if (!category) return { error: 'Ye category maujood nahi hai.' };
  if (!metalType) return { error: 'Ye metal type maujood nahi hai.' };

  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    categoryId: category.id,
    metalTypeId: metalType.id,
    status: parsed.data.status,
    featured: parsed.data.featured,
    stoneValuePaise: rupeesToPaise(parsed.data.stoneValue),
    stoneDescription: parsed.data.stoneDescription || null,
    makingPercentBp,
  };

  let productId: string;
  if (id) {
    const existing = await db.product.findFirst({ where: { id, shopId: shop.id } });
    if (!existing) return { error: 'Ye product maujood nahi hai.' };
    productId = (await db.product.update({ where: { id }, data })).id;
  } else {
    const slug = slugify(parsed.data.name);
    if (!slug) return { error: 'Naam me kam se kam ek akshar ya number hona chahiye.' };

    const clash = await db.product.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } });
    if (clash) return { error: `"${parsed.data.name}" naam ka product pehle se hai.` };

    productId = (await db.product.create({ data: { ...data, shopId: shop.id, slug } })).id;
  }

  // Replace the weight set wholesale — simpler and safer than diffing, and the
  // sets are three or four rows.
  await db.productWeight.deleteMany({ where: { productId } });
  await db.productWeight.createMany({
    data: weightsMg.map((weightMg, sortOrder) => ({ productId, weightMg, sortOrder })),
  });

  // Attributes, constrained to this shop's own groups.
  const requested = formData.getAll('attributeIds').map(String).filter(Boolean);
  const valid = requested.length
    ? await db.attribute.findMany({
        where: { id: { in: requested }, group: { shopId: shop.id } },
        select: { id: true },
      })
    : [];
  await db.productAttribute.deleteMany({ where: { productId } });
  if (valid.length > 0) {
    await db.productAttribute.createMany({
      data: valid.map(({ id: attributeId }) => ({ productId, attributeId })),
    });
  }

  // Images — appended, never replaced, so an edit does not drop existing photos.
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  const existingCount = await db.productImage.count({ where: { productId } });

  for (const [i, file] of files.entries()) {
    try {
      const processed = await processUpload(Buffer.from(await file.arrayBuffer()), uploadDir);
      await db.productImage.create({
        data: {
          productId,
          basePath: processed.basePath,
          alt: parsed.data.name,
          width: processed.width,
          height: processed.height,
          sortOrder: existingCount + i,
          isPrimary: existingCount === 0 && i === 0,
        },
      });
    } catch (e) {
      return { error: `Photo upload nahi hui: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  await recomputeAllPriceCaches();
  revalidatePath('/admin/products');
  revalidatePath('/', 'layout');
  redirect('/admin/products');
}

export async function deleteProduct(id: string) {
  const shop = await getShop();
  await db.product.deleteMany({ where: { id, shopId: shop.id } });
  revalidatePath('/admin/products');
  revalidatePath('/', 'layout');
  redirect('/admin/products');
}
