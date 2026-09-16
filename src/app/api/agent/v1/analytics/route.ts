import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateAgentRequest } from '@/lib/agent-auth.server';
import { formatINR } from '@/lib/money';

export async function GET(request: Request) {
  const auth = await authenticateAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'today';

  const now = new Date();
  let startDate: Date;

  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // Default 'today': start of current day
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const orders = await db.order.findMany({
    where: {
      shopId: auth.shop.id,
      createdAt: { gte: startDate },
    },
    select: {
      id: true,
      status: true,
      totalPaise: true,
    },
  });

  const statusBreakdown: Record<string, number> = {};
  let totalRevenuePaise = 0;

  for (const order of orders) {
    statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
    if (order.status !== 'CANCELLED') {
      totalRevenuePaise += order.totalPaise;
    }
  }

  const wishlistAdditionsCount = await db.wishlistItem.count({
    where: {
      shopId: auth.shop.id,
      createdAt: { gte: startDate },
    },
  });

  const productViewsCount = await db.customerActivity.count({
    where: {
      shopId: auth.shop.id,
      eventType: 'PRODUCT_VIEW',
      createdAt: { gte: startDate },
    },
  });

  return NextResponse.json(
    {
      success: true,
      period,
      orders: {
        count: orders.length,
        totalRevenuePaise,
        totalRevenueFormatted: formatINR(totalRevenuePaise),
        statusBreakdown,
      },
      engagement: {
        wishlistAdditions: wishlistAdditionsCount,
        activeCustomerViews: productViewsCount,
        productViews: productViewsCount,
      },
    },
    { status: 200 }
  );
}
