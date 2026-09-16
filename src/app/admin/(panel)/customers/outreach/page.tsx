import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import { CustomerSegmentFilters } from '@/components/admin/CustomerSegmentFilters';
import { OutreachWorkspace } from '@/components/admin/OutreachWorkspace';
import {
  getFilteredCustomers,
  getAllCustomerTags,
  getCampaignTemplates,
} from '@/lib/crm.server';
import { getActivePromotions } from '@/lib/promotions.server';
import { getShop } from '@/lib/shop';
import { normalizeFilterParams } from '@/components/admin/crm-ui-helpers';

export const dynamic = 'force-dynamic';

export default async function OutreachPage({
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

  const shop = await getShop();
  const [templates, allTags, customers, activePromotions] = await Promise.all([
    getCampaignTemplates(),
    getAllCustomerTags(),
    getFilteredCustomers(filterInput),
    getActivePromotions(shop.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach & Broadcast Hub"
        description={`${customers.length} matching ${
          customers.length === 1 ? 'customer' : 'customers'
        } in selected broadcast segment.`}
        action={
          <ButtonLink href="/admin/customers" intent="secondary">
            Back to Customers
          </ButtonLink>
        }
      />

      <Suspense
        fallback={
          <div className="h-32 rounded-card border border-line bg-surface animate-pulse" />
        }
      >
        <CustomerSegmentFilters tags={allTags} resultCount={customers.length} />
      </Suspense>

      <OutreachWorkspace
        shopName={shop.name}
        shopPhone={shop.phone}
        initialTemplates={templates}
        customers={customers}
        tags={allTags}
        activePromotions={activePromotions}
      />
    </div>
  );
}
