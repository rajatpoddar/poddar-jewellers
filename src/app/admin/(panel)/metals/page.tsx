import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { updateMetalType, deactivateMetalType, reactivateMetalType } from './actions';
import { NewMetalForm } from './form';
import { PageHeader, RowList, EmptyState } from '@/components/ui/Surface';
import { Notice, Badge } from '@/components/ui/Notice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';

export const dynamic = 'force-dynamic';

export default async function MetalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const shop = await getShop();
  const metals = await db.metalType.findMany({
    where: { shopId: shop.id },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Metal types"
        description={
          <>
            Aapki dukaan kaun-kaun se metal aur purity me kaam karti hai. Yahan naya jodte hi{' '}
            <strong>Aaj ka Rate</strong> screen par uska box apne aap aa jayega.
          </>
        }
      />

      {error && <Notice tone="danger">{error}</Notice>}

      <RowList>
        {metals.length === 0 && (
          <EmptyState title="Abhi koi metal type nahi hai">
            Neeche se pehla metal jodiye — jaise Gold 22K.
          </EmptyState>
        )}

        {metals.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <code className="min-w-36 text-sm text-ink-faint">{m.key}</code>

            <form
              action={updateMetalType.bind(null, m.id)}
              className="flex min-w-60 flex-1 items-center gap-3"
            >
              <Input
                name="label"
                defaultValue={m.label}
                aria-label={`${m.key} ka label`}
                width="auto"
                className="w-full max-w-64"
              />
              <Button type="submit" intent="secondary">
                Save
              </Button>
            </form>

            <span className="min-w-24 text-sm text-ink-faint">
              {m._count.products} {m._count.products === 1 ? 'product' : 'products'}
            </span>

            {/* Deactivating is reversible, so it is `secondary`, not `danger`.
                A metal type is never deleted — products point at it. */}
            {m.isActive ? (
              <form action={deactivateMetalType.bind(null, m.id)}>
                <Button type="submit" intent="quiet">
                  Band karein
                </Button>
              </form>
            ) : (
              <form action={reactivateMetalType.bind(null, m.id)} className="flex items-center gap-3">
                <Badge>band</Badge>
                <Button type="submit" intent="secondary">
                  Wapas chalu
                </Button>
              </form>
            )}
          </div>
        ))}
      </RowList>

      <NewMetalForm />
    </div>
  );
}
