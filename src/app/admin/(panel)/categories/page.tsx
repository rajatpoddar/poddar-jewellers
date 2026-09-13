import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { updateCategory, deleteCategory } from './actions';
import { NewCategoryForm } from './form';
import { PageHeader, RowList, EmptyState } from '@/components/ui/Surface';
import { Notice } from '@/components/ui/Notice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { TrashIcon } from '@/components/ui/icons';

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
      <PageHeader
        title="Categories"
        description={
          <>
            Making charge khaali chhod dijiye to default <strong>{defaultPercent}%</strong> lagega.
          </>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <RowList>
        {categories.length === 0 && (
          <EmptyState title="Abhi koi category nahi hai">
            Neeche se pehli category jodiye — jaise Necklace, Ring, Bangle.
          </EmptyState>
        )}

        {categories.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <form
              action={updateCategory.bind(null, c.id)}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
            >
              <Input
                name="name"
                defaultValue={c.name}
                aria-label={`${c.name} ka naam`}
                width="auto"
                className="min-w-45 flex-1"
              />
              <span className="min-w-32 text-sm text-ink-faint">
                {c.parent ? `under ${c.parent.name}` : 'top level'}
              </span>
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <Input
                  name="makingPercent"
                  inputMode="decimal"
                  numeric
                  placeholder={String(defaultPercent)}
                  defaultValue={c.makingPercentBp === null ? '' : String(c.makingPercentBp / 100)}
                  width="auto"
                  className="w-20"
                />
                % making
              </label>
              <Button type="submit" intent="secondary">
                Save
              </Button>
            </form>

            <span className="min-w-24 text-sm text-ink-faint">
              {c._count.products} {c._count.products === 1 ? 'product' : 'products'}
            </span>

            {/* Deleting is the only irreversible thing on this screen, so it is
                the only red thing on this screen. */}
            <form action={deleteCategory.bind(null, c.id)}>
              <Button type="submit" intent="danger" aria-label={`${c.name} category hataiye`}>
                <TrashIcon />
              </Button>
            </form>
          </div>
        ))}
      </RowList>

      <NewCategoryForm
        parents={categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }))}
        defaultPercent={defaultPercent}
      />
    </div>
  );
}
