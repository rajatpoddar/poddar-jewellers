import { estimate } from '../pricing/engine';
import type { RateSet, RoundingConfig } from '../pricing/types';
import { db } from '../db';
import { getShop } from '../shop';
import { getLatestRate } from '../rates.server';
import { resolveMakingPercent } from '../pricing/making';
import type { OrderStatus } from '@prisma/client';

export interface OrderSnapshotInput {
  weightMg: number;
  metalRatePaise: number;
  makingPercentBp: number;
  stoneValuePaise: number;
  gstPercentBp: number;
  rounding?: RoundingConfig;
}

export interface OrderSnapshot {
  metalPaise: number;
  makingPaise: number;
  stonePaise: number;
  gstPaise: number;
  roundingPaise: number;
  totalPaise: number;
}

export function calculateOrderSnapshot(input: OrderSnapshotInput): OrderSnapshot {
  const rates: RateSet = { SNAPSHOT: input.metalRatePaise };
  const rounding: RoundingConfig = input.rounding ?? {
    stepPaise: 10000,
    smallStepPaise: 1000,
    thresholdPaise: 1000000,
  };

  const est = estimate(
    {
      weightMg: input.weightMg,
      metalKey: 'SNAPSHOT',
      makingPercentBp: input.makingPercentBp,
      stoneValuePaise: input.stoneValuePaise,
    },
    rates,
    input.gstPercentBp,
    rounding
  );

  const roundingPaise = est.displayPaise - est.totalPaise;

  return {
    metalPaise: est.metalPaise,
    makingPaise: est.makingPaise,
    stonePaise: est.stonePaise,
    gstPaise: est.gstPaise,
    roundingPaise,
    totalPaise: est.displayPaise,
  };
}

export interface CreateOrderInput {
  shopId?: string;
  customerId: string;
  productId: string;
  weightMg: number;
  requiredByDate?: Date | string | null;
  customerNotes?: string | null;
}

export async function createOrder(input: CreateOrderInput) {
  const shop = input.shopId
    ? await db.shop.findUnique({ where: { id: input.shopId } })
    : await getShop();

  if (!shop) {
    throw new Error('Shop not found');
  }

  const product = await db.product.findUnique({
    where: { id: input.productId },
    include: {
      metalType: true,
      category: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // Build category chain for making charge resolution
  const categoryChain = [];
  let currentCat: typeof product.category | null = product.category;
  while (currentCat) {
    categoryChain.push({ name: currentCat.name, makingPercentBp: currentCat.makingPercentBp });
    currentCat = currentCat.parent as any;
  }

  const makingRes = resolveMakingPercent(product, categoryChain, shop.defaultMakingPercentBp);
  const makingPercentBp = makingRes.percentBp;

  const latestRateData = await getLatestRate();
  const metalRatePaise = latestRateData?.rates[product.metalType.key];

  if (!metalRatePaise) {
    throw new Error(`Metal rate for "${product.metalType.label}" is not available today.`);
  }

  const snapshot = calculateOrderSnapshot({
    weightMg: input.weightMg,
    metalRatePaise,
    makingPercentBp,
    stoneValuePaise: product.stoneValuePaise,
    gstPercentBp: shop.gstPercentBp,
    rounding: {
      stepPaise: shop.roundingStepPaise,
      smallStepPaise: shop.roundingSmallStepPaise,
      thresholdPaise: shop.roundingThresholdPaise,
    },
  });

  const year = new Date().getFullYear();
  const count = await db.order.count({
    where: { shopId: shop.id },
  });
  const seq = (count + 1).toString().padStart(4, '0');
  const orderNumber = `ORD-${year}-${seq}`;

  return db.order.create({
    data: {
      shopId: shop.id,
      orderNumber,
      customerId: input.customerId,
      status: 'PENDING',
      requiredByDate: input.requiredByDate ? new Date(input.requiredByDate) : null,
      customerNotes: input.customerNotes || null,
      metalPaise: snapshot.metalPaise,
      makingPaise: snapshot.makingPaise,
      stonePaise: snapshot.stonePaise,
      gstPaise: snapshot.gstPaise,
      roundingPaise: snapshot.roundingPaise,
      totalPaise: snapshot.totalPaise,
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            weightMg: input.weightMg,
            weightGrams: input.weightMg / 1000,
            metalRatePaise,
            makingPercentBp,
            stoneValuePaise: product.stoneValuePaise,
            pricePaise: snapshot.totalPaise,
          },
        ],
      },
    },
    include: {
      items: true,
      customer: true,
    },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const shop = await getShop();
  return db.order.update({
    where: { id: orderId, shopId: shop.id },
    data: { status },
    include: {
      customer: true,
    },
  });
}

export async function getCustomerOrders(customerId: string) {
  const shop = await getShop();
  return db.order.findMany({
    where: { shopId: shop.id, customerId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(orderId: string) {
  const shop = await getShop();
  return db.order.findFirst({
    where: { id: orderId, shopId: shop.id },
    include: {
      shop: true,
      customer: true,
      items: {
        include: {
          product: {
            include: {
              metalType: true,
            },
          },
        },
      },
    },
  });
}

export async function getAdminOrders(search?: string, statusFilter?: OrderStatus) {
  const shop = await getShop();
  const where: any = { shopId: shop.id };

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: q, mode: 'insensitive' } } },
    ];
  }

  return db.order.findMany({
    where,
    include: {
      customer: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
