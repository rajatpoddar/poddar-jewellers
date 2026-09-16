import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import {
  buildCustomerFilterQuery,
  type CustomerFilterInput,
} from './crm-template-helpers';

export type { CustomerFilterInput };

/**
 * Fetches filtered customers along with their tags, wishlist items,
 * recent activities, orders, and recent outreach logs.
 */
export async function getFilteredCustomers(filters: CustomerFilterInput = {}) {
  const shop = await getShop();
  const where = buildCustomerFilterQuery(filters, shop.id);

  return db.customer.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      tags: {
        orderBy: { name: 'asc' },
      },
      wishlist: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              category: true,
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
              },
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      },
      outreachLogs: {
        orderBy: { sentAt: 'desc' },
        take: 5,
      },
    },
  });
}

/**
 * Creates or updates a customer tag scoped to the current shop.
 */
export async function createCustomerTag(name: string, color?: string) {
  const shop = await getShop();
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error('Tag name cannot be empty');
  }

  return db.customerTag.upsert({
    where: {
      shopId_name: {
        shopId: shop.id,
        name: cleanName,
      },
    },
    create: {
      shopId: shop.id,
      name: cleanName,
      color: color?.trim() || null,
    },
    update: {
      ...(color ? { color: color.trim() } : {}),
    },
  });
}

/**
 * Assigns a tag to a customer, verifying shop ownership.
 */
export async function assignTagToCustomer(customerId: string, tagId: string) {
  const shop = await getShop();
  const customer = await db.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  return db.customer.update({
    where: { id: customerId },
    data: {
      tags: {
        connect: { id: tagId },
      },
    },
  });
}

/**
 * Removes a tag from a customer, verifying shop ownership.
 */
export async function removeTagFromCustomer(customerId: string, tagId: string) {
  const shop = await getShop();
  const customer = await db.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  return db.customer.update({
    where: { id: customerId },
    data: {
      tags: {
        disconnect: { id: tagId },
      },
    },
  });
}

/**
 * Retrieves all customer tags for the current shop with customer counts.
 */
export async function getAllCustomerTags() {
  const shop = await getShop();
  return db.customerTag.findMany({
    where: { shopId: shop.id },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { customers: true },
      },
    },
  });
}

/**
 * Retrieves all campaign templates for the current shop.
 */
export async function getCampaignTemplates() {
  const shop = await getShop();
  return db.campaignTemplate.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates or updates a campaign template for the current shop.
 */
export async function saveCampaignTemplate(
  name: string,
  bodyText: string,
  id?: string
) {
  const shop = await getShop();
  const cleanName = name.trim();
  const cleanBody = bodyText.trim();

  if (!cleanName) {
    throw new Error('Template name cannot be empty');
  }

  if (id) {
    const existing = await db.campaignTemplate.findFirst({
      where: { id, shopId: shop.id },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    return db.campaignTemplate.update({
      where: { id },
      data: {
        name: cleanName,
        bodyText: cleanBody,
      },
    });
  }

  return db.campaignTemplate.create({
    data: {
      shopId: shop.id,
      name: cleanName,
      bodyText: cleanBody,
    },
  });
}

/**
 * Deletes a campaign template for the current shop.
 */
export async function deleteCampaignTemplate(id: string) {
  const shop = await getShop();
  const existing = await db.campaignTemplate.findFirst({
    where: { id, shopId: shop.id },
  });

  if (!existing) {
    throw new Error('Template not found');
  }

  return db.campaignTemplate.delete({
    where: { id },
  });
}

/**
 * Logs an outreach message sent to a customer.
 */
export async function logOutreachSent(
  customerId: string,
  templateId: string | null,
  messageText: string
) {
  const shop = await getShop();
  const customer = await db.customer.findFirst({
    where: { id: customerId, shopId: shop.id },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  return db.outreachLog.create({
    data: {
      shopId: shop.id,
      customerId,
      templateId: templateId || null,
      messageText,
      channel: 'WHATSAPP',
    },
  });
}
