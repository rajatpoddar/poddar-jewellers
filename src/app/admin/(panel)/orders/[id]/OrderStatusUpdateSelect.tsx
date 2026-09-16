'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/Field';
import { updateOrderStatusAdminAction } from '@/app/(store)/orders/actions';
import type { OrderStatus } from '@prisma/client';

export function OrderStatusUpdateSelect({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: OrderStatus) {
    setLoading(true);
    setError(null);
    const res = await updateOrderStatusAdminAction(orderId, newStatus);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Status update fail ho gaya');
      return;
    }
    setStatus(newStatus);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        className="text-xs py-1.5"
      >
        <option value="PENDING">Status: Pending Confirmation</option>
        <option value="CONFIRMED">Status: Confirmed</option>
        <option value="IN_PROGRESS">Status: In Progress / Crafting</option>
        <option value="READY">Status: Ready for Pickup</option>
        <option value="COMPLETED">Status: Completed</option>
        <option value="CANCELLED">Status: Cancelled</option>
      </Select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
