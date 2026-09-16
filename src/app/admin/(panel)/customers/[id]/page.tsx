import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { getAllCustomerTags } from '@/lib/crm.server';
import { formatINR } from '@/lib/money';
import { sanitizeIndianPhone } from '@/lib/whatsapp/evolution';
import { PageHeader, Card, RowList, EmptyState } from '@/components/ui/Surface';
import { BackLink } from '@/components/ui/BackLink';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Notice';
import { TagBadgeSelect } from '@/components/admin/TagBadgeSelect';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shop = await getShop();

  const [customer, availableTags] = await Promise.all([
    db.customer.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
      include: {
        tags: {
          orderBy: { name: 'asc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            product: {
              select: { name: true, slug: true },
            },
          },
        },
        wishlist: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: { name: true, slug: true },
            },
          },
        },
        outreachLogs: {
          orderBy: { sentAt: 'desc' },
          include: {
            template: {
              select: { name: true },
            },
          },
        },
      },
    }),
    getAllCustomerTags(),
  ]);

  if (!customer) {
    notFound();
  }

  const cleanPhone = sanitizeIndianPhone(customer.phone);
  const waMessage = `Namaste ${customer.name} ji, ${shop.name} se aapke liye vishesh prastav hai. Kya hum aapki koi madad kar sakte hain?`;
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

  const addressText =
    [customer.addressLine1, customer.addressLine2, customer.city, customer.pincode]
      .filter(Boolean)
      .join(', ') || 'Address recorded nahi hai';

  return (
    <div className="space-y-6">
      <BackLink href="/admin/customers">Wapas Customers list par</BackLink>

      <PageHeader
        title={customer.name}
        description={`Mobile: ${customer.phone} · Address: ${addressText}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/admin/customers/outreach" intent="secondary">
              Outreach Hub
            </ButtonLink>
            <ButtonLink href={waUrl} target="_blank" rel="noopener noreferrer">
              1-Tap WhatsApp
            </ButtonLink>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Customer Details, Tags & Consent */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Information Panel */}
          <Card className="p-5 space-y-4">
            <h3 className="font-display text-lg text-ink">Customer Information</h3>

            <div>
              <p className="text-xs font-medium uppercase text-ink-faint">Phone Number</p>
              <p className="numeric text-base font-medium text-ink">{customer.phone}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-ink-faint">Full Address</p>
              <p className="text-sm text-ink-muted">{addressText}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-ink-faint">Diary Notes</p>
              <p className="text-sm text-ink-muted">
                {customer.notes || 'Koi diary note nahi hai.'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-ink-faint">Joined On</p>
              <p className="text-sm text-ink-muted">
                {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </Card>

          {/* WhatsApp Marketing Consent Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-ink">WhatsApp Consent</h3>
              <Badge tone={customer.marketingOptIn ? 'good' : 'neutral'}>
                {customer.marketingOptIn ? 'Opted In' : 'Not Opted In'}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-ink-faint">Consent Status</p>
                <p className="font-medium text-ink">
                  WhatsApp Opt-In: {customer.marketingOptIn ? 'Yes' : 'No'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-ink-faint">Opt-In Source</p>
                <p className="text-ink-muted">
                  {customer.optInSource || 'Recorded offline / manual'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-ink-faint">Opt-In Date</p>
                <p className="text-ink-muted">
                  {customer.optInAt
                    ? new Date(customer.optInAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Not recorded'}
                </p>
              </div>
            </div>
          </Card>

          {/* Customer Tags Card */}
          <Card className="p-5">
            <TagBadgeSelect
              customerId={customer.id}
              initialAssignedTags={customer.tags}
              availableTags={availableTags}
            />
          </Card>

          {/* Customer Wishlist Summary */}
          <Card className="p-5 space-y-3">
            <h3 className="font-display text-lg text-ink">
              Wishlist Items ({customer.wishlist.length})
            </h3>
            {customer.wishlist.length === 0 ? (
              <p className="text-sm text-ink-faint">Wishlist me koi item nahi hai.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {customer.wishlist.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2">
                    <span className="font-medium text-ink">{item.product.name}</span>
                    <span className="text-xs text-ink-faint">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right Column: Orders, Outreach Logs & Activity Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order History */}
          <div className="space-y-3">
            <h3 className="font-display text-xl text-ink">
              Order History ({customer.orders.length})
            </h3>
            <RowList>
              {customer.orders.length === 0 && (
                <EmptyState title="Koi order nahi milaa">
                  Is customer ke dwara abhi tak koi order/reservation nahi lagaya gaya hai.
                </EmptyState>
              )}

              {customer.orders.map((order) => (
                <div
                  key={order.id}
                  className="space-y-2 p-4 transition-colors hover:bg-surface-sunk"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-medium text-ink">
                        #{order.orderNumber}
                      </span>
                      <span className="ml-3 text-xs text-ink-faint">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="numeric text-base font-semibold text-ink">
                        {formatINR(order.totalPaise)}
                      </span>
                      <Badge tone={order.status === 'COMPLETED' ? 'good' : 'neutral'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>

                  {order.items.length > 0 && (
                    <div className="space-y-1 border-l-2 border-line pl-2 text-xs text-ink-muted">
                      {order.items.map((item) => (
                        <p key={item.id}>
                          • {item.productName} ({item.weightGrams}g) — {formatINR(item.pricePaise)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </RowList>
          </div>

          {/* Outreach History Timeline */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl text-ink">
                Outreach History ({customer.outreachLogs.length})
              </h3>
              <ButtonLink href="/admin/customers/outreach" intent="secondary">
                Outreach Hub
              </ButtonLink>
            </div>

            <Card className="p-5">
              {customer.outreachLogs.length === 0 ? (
                <p className="text-sm text-ink-faint">Koi marketing outreach history nahi hai.</p>
              ) : (
                <ol className="relative my-2 ml-3 space-y-4 border-l border-line">
                  {customer.outreachLogs.map((log) => (
                    <li key={log.id} className="ml-6">
                      <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-line bg-surface" />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-ink">
                              {log.template?.name || 'Custom Outreach'}
                            </span>
                            <Badge tone="good">{log.channel}</Badge>
                          </div>
                          <time className="text-xs text-ink-faint">
                            {new Date(log.sentAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                        <p className="whitespace-pre-wrap rounded-field border border-line bg-surface-sunk p-2.5 text-xs text-ink-muted">
                          {log.messageText}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {/* Activity Log Timeline */}
          <div className="space-y-3">
            <h3 className="font-display text-xl text-ink">Activity Log Timeline</h3>
            <Card className="p-5">
              {customer.activities.length === 0 ? (
                <p className="text-sm text-ink-faint">Koi recorded activity nahi hai.</p>
              ) : (
                <ol className="relative my-2 ml-3 space-y-4 border-l border-line">
                  {customer.activities.map((act) => {
                    let activityLabel = act.eventType as string;
                    if (act.eventType === 'PRODUCT_VIEW') {
                      activityLabel = `Viewed product: ${act.product?.name || 'Product'}`;
                    } else if (act.eventType === 'WISHLIST_ADD') {
                      activityLabel = `Added to wishlist: ${act.product?.name || 'Product'}`;
                    } else if (act.eventType === 'WISHLIST_REMOVE') {
                      activityLabel = `Removed from wishlist: ${act.product?.name || 'Product'}`;
                    } else if (act.eventType === 'SEARCH_QUERY') {
                      activityLabel = `Searched for: ${act.metadata || 'Keyword'}`;
                    } else if (act.eventType === 'WHATSAPP_ENQUIRE') {
                      activityLabel = `WhatsApp enquiry on ${act.product?.name || 'Item'}`;
                    }

                    return (
                      <li key={act.id} className="ml-6">
                        <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-line bg-surface" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{activityLabel}</p>
                          <time className="text-xs text-ink-faint">
                            {new Date(act.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
