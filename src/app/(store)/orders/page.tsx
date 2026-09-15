import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/lib/auth/customer-session';
import { getCustomerOrders } from '@/lib/orders/engine';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/Notice';
import { Card, EmptyState } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import Image from 'next/image';

import { getShop } from '@/lib/shop';

export async function generateMetadata() {
  const shop = await getShop();
  return {
    title: `My Orders | ${shop.name}`,
  };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return <Badge tone="warn">Pending Confirmation</Badge>;
    case 'CONFIRMED':
      return <Badge tone="good">Order Confirmed</Badge>;
    case 'IN_PROGRESS':
      return <Badge tone="neutral">Crafting In Progress</Badge>;
    case 'READY':
      return <Badge tone="good">Ready for Pickup</Badge>;
    case 'COMPLETED':
      return <Badge tone="good">Completed</Badge>;
    case 'CANCELLED':
      return <Badge tone="warn">Cancelled</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

export default async function CustomerOrdersPage() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect('/login?returnUrl=/orders');
  }

  const orders = await getCustomerOrders(customer.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink">Aapke Orders & Bookings</h1>
        <p className="text-sm text-ink-muted mt-1">
          Aapke dwaara reserve kiye gaye saare designs aur unka status
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Koi Order Ya Booking Nahi Hai">
          <p className="mb-4 text-ink-muted">
            Aapne abhi tak koi design book ya reserve nahi kiya hai.
          </p>
          <ButtonLink href="/search" intent="primary" size="lg">
            Catalog Search Karein →
          </ButtonLink>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="p-6 space-y-6 border border-line">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-ink numeric">{order.orderNumber}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <span className="text-xs text-ink-muted block mt-1">
                    Booked on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs text-ink-muted block uppercase tracking-wider">Total Amount</span>
                  <span className="font-display text-2xl font-bold text-ink numeric">
                    {formatINR(order.totalPaise)}
                  </span>
                </div>
              </div>

              {order.requiredByDate && (
                <div className="bg-surface-sunk border border-line p-3 rounded-field text-xs text-ink-muted flex items-center justify-between">
                  <span>Target Shaadi / Festival Date:</span>
                  <strong className="text-ink numeric font-semibold">
                    {new Date(order.requiredByDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                {order.items.map((item) => {
                  const firstImg = item.product?.images?.[0];
                  const imgSrc = firstImg
                    ? (firstImg.basePath.startsWith('/') || firstImg.basePath.startsWith('http')
                        ? firstImg.basePath
                        : `/uploads/${firstImg.basePath}-800.webp`)
                    : null;

                  return (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-surface-sunk rounded-card border border-line relative overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {imgSrc ? (
                          <Image
                            src={imgSrc}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-ink-faint">No Image</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold text-ink text-base">{item.productName}</h4>
                        <p className="text-xs text-ink-muted">
                          Weight: <span className="numeric">{item.weightGrams}g</span> · Rate: <span className="numeric">{formatINR(item.metalRatePaise)}/g</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-ink numeric">{formatINR(item.pricePaise)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {order.customerNotes && (
                <div className="text-xs text-ink-muted italic bg-surface p-3 rounded-field border border-line">
                  &ldquo;{order.customerNotes}&rdquo;
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
