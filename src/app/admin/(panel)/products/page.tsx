import Link from 'next/link';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { formatINR } from '@/lib/money';
import { PageHeader, RowList, EmptyState } from '@/components/ui/Surface';
import { Badge } from '@/components/ui/Notice';
import { ButtonLink } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const shop = await getShop();
  const products = await db.product.findMany({
    where: { shopId: shop.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      category: { select: { name: true } },
      metalType: { select: { label: true } },
      _count: { select: { weights: true, images: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${products.length} ${products.length === 1 ? 'product' : 'products'} is dukaan me.`}
        action={
          <ButtonLink href="/admin/products/new">
            <PlusIcon />
            Naya product
          </ButtonLink>
        }
      />

      <RowList>
        {products.length === 0 && (
          <EmptyState title="Abhi koi product nahi hai">
            Upar <strong>Naya product</strong> dabaiye aur pehla item jodiye.
          </EmptyState>
        )}

        {products.map((p) => (
          <Link
            key={p.id}
            href={`/admin/products/${p.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-surface-sunk"
          >
            {/* Name and status lead the row: the two things scanned for. */}
            <span className="min-w-45 flex-1 font-medium text-ink">{p.name}</span>

            <span className="text-sm text-ink-faint">
              {p.category.name} · {p.metalType.label}
            </span>

            <span className="min-w-28 text-sm text-ink-faint">
              {p._count.weights} weights · {p._count.images} photos
            </span>

            <span className="numeric min-w-40 text-sm text-ink-muted">
              {p.cachedPriceMinPaise !== null && p.cachedPriceMaxPaise !== null
                ? `${formatINR(p.cachedPriceMinPaise)} – ${formatINR(p.cachedPriceMaxPaise)}`
                : 'aaj ka rate nahi hai'}
            </span>

            <Badge tone={p.status === 'LIVE' ? 'good' : 'neutral'}>{p.status}</Badge>
          </Link>
        ))}
      </RowList>
    </div>
  );
}
