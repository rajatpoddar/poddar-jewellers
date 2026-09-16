import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateAgentRequest } from '@/lib/agent-auth.server';

export async function GET(request: Request) {
  const auth = await authenticateAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawCustomers = await db.customer.findMany({
    where: {
      shopId: auth.shop.id,
      wishlist: {
        some: {},
      },
      orders: {
        none: {},
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      wishlist: {
        select: {
          id: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              cachedPriceMinPaise: true,
              cachedPriceMaxPaise: true,
            },
          },
          createdAt: true,
        },
      },
    },
  });

  const leads = rawCustomers.map((customer) => ({
    customerId: customer.id,
    name: customer.name,
    phone: customer.phone,
    wishlistItems: customer.wishlist.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productSlug: item.product.slug,
      cachedPriceMinPaise: item.product.cachedPriceMinPaise,
      cachedPriceMaxPaise: item.product.cachedPriceMaxPaise,
      addedAt: item.createdAt.toISOString(),
    })),
  }));

  return NextResponse.json(
    {
      success: true,
      count: leads.length,
      leads,
    },
    { status: 200 }
  );
}
