import { Suspense } from 'react';
import Link from 'next/link';
import { PageHeader, RowList, EmptyState } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/Notice';
import { CustomerSegmentFilters } from '@/components/admin/CustomerSegmentFilters';
import { getFilteredCustomers, getAllCustomerTags } from '@/lib/crm.server';
import { normalizeFilterParams } from '@/components/admin/crm-ui-helpers';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    optIn?: string;
    tagId?: string;
    eventWithinDays?: string;
    search?: string;
    q?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  const filterInput = normalizeFilterParams({
    optIn: params.optIn,
    tagId: params.tagId,
    eventWithinDays: params.eventWithinDays,
    search: params.search || params.q,
  });

  const [customers, allTags] = await Promise.all([
    getFilteredCustomers(filterInput),
    getAllCustomerTags(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'} recorded.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/admin/customers/outreach" intent="secondary">
              Outreach Hub
            </ButtonLink>
            <ButtonLink href="/admin/customers/import">
              <PlusIcon />
              Import Diary Contacts
            </ButtonLink>
          </div>
        }
      />

      <Suspense
        fallback={
          <div className="h-32 rounded-card border border-line bg-surface animate-pulse" />
        }
      >
        <CustomerSegmentFilters tags={allTags} resultCount={customers.length} />
      </Suspense>

      <RowList>
        {customers.length === 0 && (
          <EmptyState title="Koi matching customer nahi mila">
            Diye gaye filter criteria ke hisaab se koi customer record nahi mila. Filters clear karke check karein ya naye contacts import karein.
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

          const address =
            [c.addressLine1, c.city, c.pincode].filter(Boolean).join(', ') || 'No address';

          return (
            <Link
              key={c.id}
              href={`/admin/customers/${c.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-sunk"
            >
              <div className="min-w-48 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{c.name}</p>
                  <Badge tone={c.marketingOptIn ? 'good' : 'neutral'}>
                    WhatsApp Opt-In: {c.marketingOptIn ? 'Yes' : 'No'}
                  </Badge>
                </div>

                <p className="text-sm text-ink-muted">{address}</p>

                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {c.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-pill border border-line bg-surface-sunk px-2 py-0.5 text-xs text-ink-muted"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span className="numeric text-sm font-medium text-ink">{c.phone}</span>

              <span className="min-w-28 text-sm text-ink-faint">
                {c.orders.length} {c.orders.length === 1 ? 'order' : 'orders'}
              </span>

              <span className="text-xs text-ink-faint">Last active: {lastActive}</span>

              <Badge tone="neutral">Profile</Badge>
            </Link>
          );
        })}
      </RowList>
    </div>
  );
}
