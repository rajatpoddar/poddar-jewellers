import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { formatINR } from '@/lib/money';
import { sanitizeIndianPhone } from '@/lib/whatsapp/evolution';
import { PageHeader, Card, RowList, EmptyState } from '@/components/ui/Surface';
import { BackLink } from '@/components/ui/BackLink';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shop = await getShop();

  const customer = await db.customer.findFirst({
    where: {
      id,
      shopId: shop.id,
    },
    include: {
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
    },
  });

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
          <ButtonLink href={waUrl} target="_blank" rel="noopener noreferrer">
            1-Tap WhatsApp Outreach
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Information Panel */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5 space-y-4">
            <h3 className="font-display text-lg text-ink">Customer Information</h3>

            <div>
              <p className="text-xs font-medium text-ink-faint uppercase">Phone Number</p>
              <p className="numeric text-base font-medium text-ink">{customer.phone}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-ink-faint uppercase">Full Address</p>
              <p className="text-sm text-ink-muted">{addressText}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-ink-faint uppercase">Diary Notes</p>
              <p className="text-sm text-ink-muted">{customer.notes || 'Koi diary note nahi hai.'}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-ink-faint uppercase">Joined On</p>
              <p className="text-sm text-ink-muted">
                {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </Card>

          {/* Customer Wishlist Summary */}
          <Card className="p-5 space-y-3">
            <h3 className="font-display text-lg text-ink">Wishlist Items ({customer.wishlist.length})</h3>
            {customer.wishlist.length === 0 ? (
              <p className="text-sm text-ink-faint">Wishlist me koi item nahi hai.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {customer.wishlist.map((item) => (
                  <li key={item.id} className="py-2 flex items-center justify-between">
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

        {/* Orders & Activity Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order History */}
          <div className="space-y-3">
            <h3 className="font-display text-xl text-ink">Order History ({customer.orders.length})</h3>
            <RowList>
              {customer.orders.length === 0 && (
                <EmptyState title="Koi order nahi milaa">
                  Is customer ke dwara abhi tak koi order/reservation nahi lagaya gaya hai.
                </EmptyState>
              )}

              {customer.orders.map((order) => (
                <div key={order.id} className="p-4 space-y-2 hover:bg-surface-sunk transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-ink font-mono text-sm">#{order.orderNumber}</span>
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
                    <div className="text-xs text-ink-muted space-y-1 pl-2 border-l-2 border-line">
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

          {/* Activity Log Timeline */}
          <div className="space-y-3">
            <h3 className="font-display text-xl text-ink">Activity Log Timeline</h3>
            <Card className="p-5">
              {customer.activities.length === 0 ? (
                <p className="text-sm text-ink-faint">Koi recorded activity nahi hai.</p>
              ) : (
                <ol className="relative border-l border-line ml-3 space-y-4 my-2">
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
