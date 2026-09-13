import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { updateCategory, deleteCategory } from './actions';
import { NewCategoryForm } from './form';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const shop = await getShop();
  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
  });

  const defaultPercent = shop.defaultMakingPercentBp / 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Categories</h1>
        <p className="text-stone-600 mt-1">
          Making charge khaali chhod dijiye to default <strong>{defaultPercent}%</strong> lagega.
        </p>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded p-4 text-red-900">{error}</div>
      )}

      <div className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {categories.map((c) => (
          <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
            <form action={updateCategory.bind(null, c.id)} className="flex flex-wrap items-center gap-3 flex-1">
              <input name="name" defaultValue={c.name}
                className="border border-stone-300 rounded px-3 py-2 flex-1 min-w-45" />
              <span className="text-sm text-stone-500 min-w-32">
                {c.parent ? `under ${c.parent.name}` : 'top level'}
              </span>
              <label className="flex items-center gap-2 text-sm">
                <input name="makingPercent" inputMode="decimal" placeholder={String(defaultPercent)}
                  defaultValue={c.makingPercentBp === null ? '' : String(c.makingPercentBp / 100)}
                  className="w-20 border border-stone-300 rounded px-2 py-2 tabular-nums" />
                <span className="text-stone-500">% making</span>
              </label>
              <button type="submit" className="text-sm underline text-stone-700">Save</button>
            </form>
            <span className="text-sm text-stone-500 min-w-24">{c._count.products} products</span>
            <form action={deleteCategory.bind(null, c.id)}>
              <button type="submit" className="text-sm underline text-stone-500">Hataiye</button>
            </form>
          </div>
        ))}
      </div>

      <NewCategoryForm
        parents={categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }))}
        defaultPercent={defaultPercent}
      />
    </div>
  );
}
