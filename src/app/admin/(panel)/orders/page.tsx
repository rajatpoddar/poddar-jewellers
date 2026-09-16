import { getAdminOrders } from '@/lib/orders/engine';
import { getShop } from '@/lib/shop';
import { AdminOrdersClient } from './AdminOrdersClient';

export const metadata = {
  title: 'Orders Dashboard | Admin',
};

export default async function AdminOrdersPage() {
  const shop = await getShop();
  const orders = await getAdminOrders();

  const formattedOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    requiredByDate: o.requiredByDate ? o.requiredByDate.toISOString() : null,
    customerNotes: o.customerNotes,
    totalPaise: o.totalPaise,
    customer: {
      id: o.customer.id,
      name: o.customer.name,
      phone: o.customer.phone,
    },
    items: o.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      weightGrams: item.weightGrams,
      metalRatePaise: item.metalRatePaise,
      pricePaise: item.pricePaise,
    })),
    notification: o.notificationQueues?.[0]
      ? {
          id: o.notificationQueues[0].id,
          status: o.notificationQueues[0].status,
          attempts: o.notificationQueues[0].attempts,
          maxAttempts: o.notificationQueues[0].maxAttempts,
          lastError: o.notificationQueues[0].lastError,
        }
      : null,
  }));

  return (
    <AdminOrdersClient
      orders={formattedOrders}
      shopWhatsapp={shop.whatsapp}
      shopName={shop.name}
      shopPhone={shop.phone}
    />
  );
}
