import { db } from '@/lib/db';
import { getShop, getMetalTypes } from '@/lib/shop';
import { resolveMakingPercent } from '@/lib/pricing/making';
import { makingSourceLabel } from '@/lib/labels';
import { ProductForm } from '@/components/admin/ProductForm';
import { PageHeader } from '@/components/ui/Surface';
import { BackLink } from '@/components/ui/BackLink';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const shop = await getShop();
  const [categories, metalTypes, attributeGroups] = await Promise.all([
    db.category.findMany({ where: { shopId: shop.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getMetalTypes(),
    db.attributeGroup.findMany({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'asc' },
      include: { attributes: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/products">Sab products</BackLink>
      <PageHeader title="Naya product" />
      <ProductForm
        product={{
          id: null, name: '', description: '', categoryId: '', metalTypeId: '',
          status: 'DRAFT', featured: false, stoneValueRupees: 0, stoneDescription: '',
          makingPercent: '', weightsGrams: '', attributeIds: [],
        }}
        options={{
          categories,
          metalTypes: metalTypes.map((m) => ({ id: m.id, label: m.label })),
          attributeGroups,
          inheritedMakingLabel: makingSourceLabel(
            resolveMakingPercent({ makingPercentBp: null }, [], shop.defaultMakingPercentBp),
          ),
        }}
      />
    </div>
  );
}
