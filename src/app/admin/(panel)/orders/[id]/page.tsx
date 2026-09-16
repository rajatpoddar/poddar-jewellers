import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrderById } from '@/lib/orders/engine';
import { getShop } from '@/lib/shop';
import { formatINR } from '@/lib/money';
import { Card, PageHeader } from '@/components/ui/Surface';
import { Badge } from '@/components/ui/Notice';
import { ButtonLink } from '@/components/ui/Button';
import { NotificationStatusBadge } from '@/components/admin/NotificationStatusBadge';
import { OrderStatusUpdateSelect } from './OrderStatusUpdateSelect';
import type { OrderStatus } from '@prisma/client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const order = await getOrderById(id);
  return {
    title: order ? `Order #${order.orderNumber} | Admin` : 'Order Details | Admin',
  };
}

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return <Badge tone="warn">Pending</Badge>;
    case 'CONFIRMED':
      return <Badge tone="good">Confirmed</Badge>;
    case 'IN_PROGRESS':
      return <Badge tone="neutral">In Progress</Badge>;
    case 'READY':
      return <Badge tone="good">Ready</Badge>;
    case 'COMPLETED':
      return <Badge tone="good">Completed</Badge>;
    case 'CANCELLED':
      return <Badge tone="warn">Cancelled</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case 'ORDER_BOOKED':
      return 'Order Booking Confirmation';
    case 'ORDER_STATUS_CHANGED':
      return 'Order Status Update';
    case 'ADMIN_NEW_ORDER_ALERT':
      return 'Admin Order Alert';
    case 'MARKETING_BROADCAST':
      return 'Marketing Campaign';
    default:
      return type;
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, shop] = await Promise.all([getOrderById(id), getShop()]);

  if (!order) {
    notFound();
  }

  const cleanPhone = order.customer.phone.replace(/[^0-9]/g, '');
  const waText = `Namaste ${order.customer.name} ji! ${shop.name} se aapka Order #${order.orderNumber} (${formatINR(order.totalPaise)}) update kiya gaya hai.`;
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

  const notifications = order.notificationQueues || [];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/orders"
          className="text-xs font-medium text-ink-muted hover:text-brand transition-colors inline-flex items-center gap-1"
        >
          &larr; Orders Dashboard pe wapas jayein
        </Link>
      </div>

      <PageHeader
        title={`Order #${order.orderNumber}`}
        description={`Customer: ${order.customer.name} (${order.customer.phone}) | Placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`}
      />

      {/* Top Status & Actions Card */}
      <Card className="p-6 border border-line space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line pb-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-ink-muted font-medium block">
              Order Status
            </span>
            <div className="flex items-center gap-3">
              {getStatusBadge(order.status)}
              <OrderStatusUpdateSelect
                orderId={order.id}
                initialStatus={order.status}
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-ink-muted block">
              Total Payable
            </span>
            <span className="font-display text-2xl font-bold text-ink numeric">
              {formatINR(order.totalPaise)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <ButtonLink
            href={`/admin/orders/${order.id}/invoice`}
            target="_blank"
            intent="primary"
            size="md"
          >
            Print A4 GST Invoice
          </ButtonLink>
          <ButtonLink href={waUrl} target="_blank" intent="secondary" size="md">
            Direct WhatsApp Chat
          </ButtonLink>
          <ButtonLink
            href={`/admin/customers/${order.customer.id}`}
            intent="quiet"
            size="md"
          >
            Customer Profile
          </ButtonLink>
        </div>
      </Card>

      {/* Customer & Delivery Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-line space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Customer Details
          </h2>
          <div className="text-sm space-y-1 text-ink">
            <div className="font-medium text-base">{order.customer.name}</div>
            <div className="text-ink-muted numeric">{order.customer.phone}</div>
            {order.customer.addressLine1 && (
              <div className="text-xs text-ink-muted pt-2 border-t border-line">
                {[
                  order.customer.addressLine1,
                  order.customer.addressLine2,
                  order.customer.city,
                  order.customer.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-line space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            Delivery & Notes
          </h2>
          <div className="text-sm space-y-2 text-ink">
            {order.requiredByDate ? (
              <div>
                <span className="text-xs text-ink-muted block">Required By Date:</span>
                <span className="numeric font-semibold text-brand">
                  {new Date(order.requiredByDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ) : (
              <div className="text-xs text-ink-muted">Target event date specified nahi hai.</div>
            )}

            {order.customerNotes && (
              <div className="pt-2 border-t border-line">
                <span className="text-xs text-ink-muted block">Customer Note:</span>
                <span className="text-xs italic text-ink">&ldquo;{order.customerNotes}&rdquo;</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Ordered Items Table */}
      <Card className="p-6 border border-line space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Ordered Items & Breakdown
        </h2>
        <div className="divide-y divide-line">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="font-medium text-ink block">{item.productName}</span>
                <span className="text-xs text-ink-muted">
                  Weight: <span className="numeric">{item.weightGrams}g</span> | Metal Rate: <span className="numeric">{formatINR(item.metalRatePaise)}/g</span>
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-ink numeric block">
                  {formatINR(item.pricePaise)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* WhatsApp Notification Delivery History & Audit Log */}
      <Card className="p-6 border border-line space-y-4">
        <div className="border-b border-line pb-3">
          <h2 className="text-base font-semibold text-ink">
            WhatsApp Notification Audit Log & Delivery History
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Is order ke liye bheje gaye automatic WhatsApp alerts, real-time status aur manual resend controls.
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-sm text-ink-muted">
            Is order ke liye abhi tak koi automatic WhatsApp notification record nahi mila.
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-surface-sunk border border-line p-4 rounded-field space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                  <div className="space-y-1">
                    <span className="font-medium text-sm text-ink block">
                      {getNotificationTypeLabel(notif.type)}
                    </span>
                    <div className="text-xs text-ink-muted space-x-3">
                      <span>Recipient: <span className="numeric">+{notif.recipient}</span></span>
                      <span>Channel: <span className="font-mono">{notif.channel}</span></span>
                      <span>
                        Sent: <span className="numeric">
                          {new Date(notif.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Delivery Status Badge & Resend Action */}
                  <NotificationStatusBadge
                    status={notif.status}
                    attempts={notif.attempts}
                    maxAttempts={notif.maxAttempts}
                    queueId={notif.id}
                    lastError={notif.lastError}
                  />
                </div>

                {/* Last Error Notice */}
                {notif.lastError && (
                  <div className="text-xs bg-danger-soft border border-danger-line text-danger p-2.5 rounded-field">
                    <strong>Delivery Error:</strong> {notif.lastError}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
