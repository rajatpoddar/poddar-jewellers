import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getShop, getMetalTypes } from '@/lib/shop';
import { resolveMakingPercent } from '@/lib/pricing/making';
import { makingSourceLabel } from '@/lib/labels';
import { ProductForm } from '@/components/admin/ProductForm';
import { deleteProduct } from '../actions';

export const dynamic = 'force-dynamic';

/** Nearest-ancestor-first chain above and including a category. */
async function chainFor(categoryId: string) {
  const chain: Array<{ name: string; makingPercentBp: number | null }> = [];
  let id: string | null = categoryId;
  const seen = new Set<string>();

  while (id && !seen.has(id)) {
    seen.add(id);
    const c: { name: string; makingPercentBp: number | null; parentId: string | null } | null =
      await db.category.findUnique({
        where: { id },
        select: { name: true, makingPercentBp: true, parentId: true },
      });
    if (!c) break;
    chain.push({ name: c.name, makingPercentBp: c.makingPercentBp });
    id = c.parentId;
  }
  return chain;
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await getShop();

  const product = await db.product.findFirst({
    where: { id, shopId: shop.id },
    include: {
      weights: { orderBy: { sortOrder: 'asc' } },
      attributes: { select: { attributeId: true } },
    },
  });
  if (!product) notFound();

  const [categories, metalTypes, attributeGroups, chain] = await Promise.all([
    db.category.findMany({ where: { shopId: shop.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getMetalTypes(),
    db.attributeGroup.findMany({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'asc' },
      include: { attributes: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } } },
    }),
    chainFor(product.categoryId),
  ]);

  // What WOULD apply if this product's own override were cleared, so the admin
  // can see the inherited value without deleting anything first.
  const inheritedMakingLabel = makingSourceLabel(
    resolveMakingPercent({ makingPercentBp: null }, chain, shop.defaultMakingPercentBp),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold text-stone-900">{product.name}</h1>
        <form action={deleteProduct.bind(null, product.id)} className="ml-auto">
          <button type="submit" className="text-sm underline text-stone-500">Product hataiye</button>
        </form>
      </div>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description ?? '',
          categoryId: product.categoryId,
          metalTypeId: product.metalTypeId,
          status: product.status,
          featured: product.featured,
          stoneValueRupees: product.stoneValuePaise / 100,
          stoneDescription: product.stoneDescription ?? '',
          makingPercent: product.makingPercentBp === null ? '' : String(product.makingPercentBp / 100),
          weightsGrams: product.weights.map((w) => w.weightMg / 1000).join(', '),
          attributeIds: product.attributes.map((a) => a.attributeId),
        }}
        options={{
          categories,
          metalTypes: metalTypes.map((m) => ({ id: m.id, label: m.label })),
          attributeGroups,
          inheritedMakingLabel,
        }}
      />
    </div>
  );
}
