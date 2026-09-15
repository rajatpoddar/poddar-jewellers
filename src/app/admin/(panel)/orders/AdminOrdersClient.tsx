'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateOrderStatusAdminAction } from '@/app/(store)/orders/actions';
import { formatINR } from '@/lib/money';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Surface';
import { Badge, Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Field';
import type { OrderStatus } from '@prisma/client';

interface OrderItemData {
  id: string;
  productName: string;
  weightGrams: number;
  metalRatePaise: number;
  pricePaise: number;
}

interface CustomerData {
  id: string;
  name: string;
  phone: string;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date | string;
  requiredByDate: Date | string | null;
  customerNotes: string | null;
  totalPaise: number;
  customer: CustomerData;
  items: OrderItemData[];
}

interface AdminOrdersClientProps {
  orders: OrderData[];
  shopWhatsapp: string;
  shopName: string;
  shopPhone: string;
}

const ALL_STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending Confirmation' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress / Crafting' },
  { value: 'READY', label: 'Ready for Pickup' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

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

export function AdminOrdersClient({ orders: initialOrders, shopName, shopPhone }: AdminOrdersClientProps) {
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);

    const res = await updateOrderStatusAdminAction(orderId, newStatus);
    setUpdatingId(null);

    if (!res.success) {
      setError(res.error || 'Status update fail ho gaya');
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchName = o.customer.name.toLowerCase().includes(q);
      const matchPhone = o.customer.phone.includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders & Bookings Dashboard"
        description="Grahakon dwaara book kiye gaye designs, status updates aur printable A4 GST invoices."
      />

      {error && <Notice tone="danger">{error}</Notice>}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-surface border border-line p-4 rounded-card">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Order #, Graahak Name ya Phone search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-line rounded-field bg-surface text-ink focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted font-medium">Status Filter:</span>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm py-1.5"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({orders.filter((o) => o.status === s.value).length})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="p-12 text-center text-ink-muted">
          Koi order nahi mila.
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const cleanPhone = order.customer.phone.replace(/[^0-9]/g, '');
            const waText = `Namaste ${order.customer.name} ji! ${shopName} se aapka Order #${order.orderNumber} (${formatINR(order.totalPaise)}) confirm ho gaya hai. Enquiry / Help ke liye call karein: ${shopPhone}. Dhanyawad!`;
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

            return (
              <Card key={order.id} className="p-6 space-y-4 border border-line">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-ink numeric">{order.orderNumber}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-sm text-ink-muted mt-1 space-x-2">
                      <span>Customer: </span>
                      <Link
                        href={`/admin/customers/${order.customer.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {order.customer.name} ({order.customer.phone})
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right mr-2">
                      <span className="text-xs text-ink-muted block uppercase tracking-wider">Total</span>
                      <span className="font-display text-xl font-bold text-ink numeric">
                        {formatINR(order.totalPaise)}
                      </span>
                    </div>

                    <Select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="text-xs py-1.5"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          Status: {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-ink-muted">
                  <div>
                    <span className="block font-medium text-ink">Order Date:</span>
                    <span className="numeric">
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {order.requiredByDate && (
                    <div>
                      <span className="block font-medium text-ink">Target Event Date:</span>
                      <span className="numeric font-semibold text-brand">
                        {new Date(order.requiredByDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items Summary */}
                <div className="bg-surface-sunk p-3 rounded-field border border-line space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-ink-faint font-semibold block">
                    Order Items:
                  </span>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-ink">
                      <span>
                        {item.productName} ({item.weightGrams}g) @ <span className="numeric">{formatINR(item.metalRatePaise)}/g</span>
                      </span>
                      <span className="font-semibold numeric">{formatINR(item.pricePaise)}</span>
                    </div>
                  ))}
                </div>

                {order.customerNotes && (
                  <div className="text-xs text-ink-muted italic">
                    Customer Note: &ldquo;{order.customerNotes}&rdquo;
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                  <ButtonLink href={waUrl} target="_blank" intent="secondary" size="md">
                    Send WhatsApp Receipt
                  </ButtonLink>
                  <ButtonLink href={`/admin/orders/${order.id}/invoice`} target="_blank" intent="primary" size="md">
                    Print A4 GST Invoice
                  </ButtonLink>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
