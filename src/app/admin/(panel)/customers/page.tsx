import Link from 'next/link';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { PageHeader, RowList, EmptyState } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const shop = await getShop();
  const customers = await db.customer.findMany({
    where: { shopId: shop.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { orders: true, activities: true } },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'} recorded.`}
        action={
          <ButtonLink href="/admin/customers/import">
            <PlusIcon />
            Import Diary Contacts
          </ButtonLink>
        }
      />

      <RowList>
        {customers.length === 0 && (
          <EmptyState title="Koi customer nahi hai">
            Upar <strong>Import Diary Contacts</strong> button dabakar offline diary ke contacts upload karein.
          </EmptyState>
        )}

        {customers.map((c) => {
          const lastActive = c.activities[0]?.createdAt
            ? new Date(c.activities[0].createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'No activity';

          const address = [c.addressLine1, c.city, c.pincode].filter(Boolean).join(', ') || 'No address';

          return (
            <Link
              key={c.id}
              href={`/admin/customers/${c.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-sunk"
            >
              <div className="min-w-48 flex-1">
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-sm text-ink-muted">{address}</p>
              </div>

              <span className="numeric text-sm font-medium text-ink">{c.phone}</span>

              <span className="min-w-28 text-sm text-ink-faint">
                {c._count.orders} {c._count.orders === 1 ? 'order' : 'orders'}
              </span>

              <span className="text-xs text-ink-faint">
                Last active: {lastActive}
              </span>

              <Badge tone="neutral">Profile</Badge>
            </Link>
          );
        })}
      </RowList>
    </div>
  );
}
