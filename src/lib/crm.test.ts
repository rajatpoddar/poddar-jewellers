import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  interpolateTemplateVariables,
  buildCustomerFilterQuery,
} from './crm-template-helpers';

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    customerTag: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    campaignTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    outreachLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/shop', () => ({
  getShop: vi.fn(),
}));

import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import {
  getFilteredCustomers,
  createCustomerTag,
  assignTagToCustomer,
  removeTagFromCustomer,
  getAllCustomerTags,
  getCampaignTemplates,
  saveCampaignTemplate,
  deleteCampaignTemplate,
  logOutreachSent,
} from './crm.server';

describe('CRM Template Interpolation', () => {
  it('interpolates customer name and shop details correctly', () => {
    const template =
      'Namaste {{CustomerName}}, {{ShopName}} me aapka swagat hai! Contact: {{ShopPhone}}. Category: {{WishlistCategory}}';
    const result = interpolateTemplateVariables(template, {
      customerName: 'Aarav Sharma',
      shopName: 'Shree Jewellers',
      shopPhone: '9876543210',
      wishlistCategory: 'Bangles',
    });

    expect(result).toBe(
      'Namaste Aarav Sharma, Shree Jewellers me aapka swagat hai! Contact: 9876543210. Category: Bangles'
    );
  });

  it('interpolates campaign promotion variables correctly', () => {
    const template =
      'Namaste {{CustomerName}}, {{ShopName}} - {{PromotionName}} ({{DiscountText}})! Link: {{ProductUrl}}';
    const result = interpolateTemplateVariables(template, {
      customerName: 'Sita',
      shopName: 'Shree Jewellers',
      promotionName: 'Dhanteras Swarna Utsav 2026',
      discountText: '25% OFF Making Charges',
      productUrl: '/c/gold-necklaces',
    });

    expect(result).toBe(
      'Namaste Sita, Shree Jewellers - Dhanteras Swarna Utsav 2026 (25% OFF Making Charges)! Link: /c/gold-necklaces'
    );
  });

  it('uses fallback for missing, empty, or whitespace customer name', () => {
    const template = 'Namaste {{CustomerName}}!';

    expect(
      interpolateTemplateVariables(template, {
        customerName: '',
        shopName: 'Shree Jewellers',
      })
    ).toBe('Namaste Grahak!');

    expect(
      interpolateTemplateVariables(template, {
        customerName: '   ',
        shopName: 'Shree Jewellers',
      })
    ).toBe('Namaste Grahak!');

    expect(
      interpolateTemplateVariables(template, {
        customerName: null,
        shopName: 'Shree Jewellers',
      })
    ).toBe('Namaste Grahak!');

    expect(
      interpolateTemplateVariables(template, {
        shopName: 'Shree Jewellers',
      })
    ).toBe('Namaste Grahak!');
  });

  it('uses fallback for missing or empty wishlist category', () => {
    const template = 'Aapki pasandida {{WishlistCategory}} par vishesh discount!';

    expect(
      interpolateTemplateVariables(template, {
        wishlistCategory: '',
      })
    ).toBe('Aapki pasandida Jewellery par vishesh discount!');

    expect(
      interpolateTemplateVariables(template, {
        wishlistCategory: null,
      })
    ).toBe('Aapki pasandida Jewellery par vishesh discount!');
  });

  it('handles case-insensitivity and internal whitespace in tags', () => {
    const template =
      'Hello {{ customername }}, welcome to {{ shopname }}! Call {{ shopPhone }}.';
    const result = interpolateTemplateVariables(template, {
      customerName: 'Priya Verma',
      shopName: 'Shree Jewellers',
      shopPhone: '9876543210',
    });

    expect(result).toBe(
      'Hello Priya Verma, welcome to Shree Jewellers! Call 9876543210.'
    );
  });

  it('handles multiple occurrences of variables', () => {
    const template =
      '{{CustomerName}}, {{CustomerName}} ji! From {{ShopName}} - {{ShopName}}';
    const result = interpolateTemplateVariables(template, {
      customerName: 'Vikram',
      shopName: 'Shree Jewellers',
    });

    expect(result).toBe(
      'Vikram, Vikram ji! From Shree Jewellers - Shree Jewellers'
    );
  });
});

describe('CRM Filter Query Builder', () => {
  const shopId = 'shop_123';
  const fixedNow = new Date('2026-09-16T12:00:00.000Z');

  it('builds base query with shopId', () => {
    const where = buildCustomerFilterQuery({}, shopId, fixedNow);
    expect(where).toEqual({
      shopId: 'shop_123',
    });
  });

  it('handles marketingOptIn true and false filters', () => {
    const optInTrue = buildCustomerFilterQuery({ optIn: true }, shopId, fixedNow);
    expect(optInTrue.marketingOptIn).toBe(true);

    const optInFalse = buildCustomerFilterQuery({ optIn: false }, shopId, fixedNow);
    expect(optInFalse.marketingOptIn).toBe(false);
  });

  it('handles tagId filter', () => {
    const where = buildCustomerFilterQuery({ tagId: 'tag_vip' }, shopId, fixedNow);
    expect(where.tags).toEqual({
      some: { id: 'tag_vip' },
    });
  });

  it('handles search filter across name and phone', () => {
    const where = buildCustomerFilterQuery({ search: '98765' }, shopId, fixedNow);
    expect(where.AND).toContainEqual({
      OR: [
        { name: { contains: '98765', mode: 'insensitive' } },
        { phone: { contains: '98765' } },
      ],
    });
  });

  it('handles categorySlug filter across wishlist and activities', () => {
    const where = buildCustomerFilterQuery({ categorySlug: 'necklaces' }, shopId, fixedNow);
    expect(where.AND).toContainEqual({
      OR: [
        { wishlist: { some: { product: { category: { slug: 'necklaces' } } } } },
        { activities: { some: { product: { category: { slug: 'necklaces' } } } } },
      ],
    });
  });

  it('handles eventWithinDays calculation', () => {
    const where = buildCustomerFilterQuery({ eventWithinDays: 15 }, shopId, fixedNow);
    const expectedTarget = new Date(fixedNow.getTime() + 15 * 24 * 60 * 60 * 1000);

    expect(where.AND).toContainEqual({
      orders: {
        some: {
          requiredByDate: {
            gte: fixedNow,
            lte: expectedTarget,
          },
        },
      },
    });
  });

  it('combines multiple conditions under AND', () => {
    const where = buildCustomerFilterQuery(
      {
        optIn: true,
        tagId: 'tag_bridal',
        search: 'Anjali',
        categorySlug: 'rings',
        eventWithinDays: 30,
      },
      shopId,
      fixedNow
    );

    expect(where.shopId).toBe('shop_123');
    expect(where.marketingOptIn).toBe(true);
    expect(where.tags).toEqual({ some: { id: 'tag_bridal' } });
    expect(where.AND).toHaveLength(3); // search, categorySlug, eventWithinDays
  });
});

describe('CRM Server Functions', () => {
  const mockShop = { id: 'shop_123', name: 'Shree Jewellers' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getShop).mockResolvedValue(mockShop as any);
  });

  it('getFilteredCustomers queries db with expected includes and filters', async () => {
    vi.mocked(db.customer.findMany).mockResolvedValue([
      { id: 'c1', name: 'Aarav' } as any,
    ]);

    const result = await getFilteredCustomers({ optIn: true, search: 'Aarav' });

    expect(result).toHaveLength(1);
    expect(db.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shopId: 'shop_123',
          marketingOptIn: true,
        }),
        include: expect.objectContaining({
          tags: expect.anything(),
          wishlist: expect.anything(),
          activities: expect.anything(),
          orders: expect.anything(),
        }),
      })
    );
  });

  it('createCustomerTag upserts tag scoped to shopId', async () => {
    vi.mocked(db.customerTag.upsert).mockResolvedValue({
      id: 'tag_1',
      shopId: 'shop_123',
      name: 'VIP',
      color: 'gold',
    } as any);

    const tag = await createCustomerTag('VIP', 'gold');

    expect(tag.name).toBe('VIP');
    expect(db.customerTag.upsert).toHaveBeenCalledWith({
      where: {
        shopId_name: {
          shopId: 'shop_123',
          name: 'VIP',
        },
      },
      create: {
        shopId: 'shop_123',
        name: 'VIP',
        color: 'gold',
      },
      update: {
        color: 'gold',
      },
    });
  });

  it('assignTagToCustomer connects tag for customer belonging to shop', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue({ id: 'c1', shopId: 'shop_123' } as any);
    vi.mocked(db.customer.update).mockResolvedValue({ id: 'c1' } as any);

    await assignTagToCustomer('c1', 'tag_1');

    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', shopId: 'shop_123' },
    });
    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        tags: { connect: { id: 'tag_1' } },
      },
    });
  });

  it('removeTagFromCustomer disconnects tag for customer belonging to shop', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue({ id: 'c1', shopId: 'shop_123' } as any);
    vi.mocked(db.customer.update).mockResolvedValue({ id: 'c1' } as any);

    await removeTagFromCustomer('c1', 'tag_1');

    expect(db.customer.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        tags: { disconnect: { id: 'tag_1' } },
      },
    });
  });

  it('getAllCustomerTags returns all tags for the current shop', async () => {
    vi.mocked(db.customerTag.findMany).mockResolvedValue([
      { id: 't1', name: 'Bridal' } as any,
    ]);

    const tags = await getAllCustomerTags();
    expect(tags).toHaveLength(1);
    expect(db.customerTag.findMany).toHaveBeenCalledWith({
      where: { shopId: 'shop_123' },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });
  });

  it('getCampaignTemplates returns all templates for the current shop', async () => {
    vi.mocked(db.campaignTemplate.findMany).mockResolvedValue([
      { id: 'tmpl_1', name: 'Diwali' } as any,
    ]);

    const templates = await getCampaignTemplates();
    expect(templates).toHaveLength(1);
    expect(db.campaignTemplate.findMany).toHaveBeenCalledWith({
      where: { shopId: 'shop_123' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('saveCampaignTemplate creates new template when id is not provided', async () => {
    vi.mocked(db.campaignTemplate.create).mockResolvedValue({
      id: 'tmpl_new',
      name: 'Festive Offer',
    } as any);

    const res = await saveCampaignTemplate('Festive Offer', 'Hello {{CustomerName}}');
    expect(res.id).toBe('tmpl_new');
    expect(db.campaignTemplate.create).toHaveBeenCalledWith({
      data: {
        shopId: 'shop_123',
        name: 'Festive Offer',
        bodyText: 'Hello {{CustomerName}}',
      },
    });
  });

  it('saveCampaignTemplate updates existing template when id is provided and scoped to shop', async () => {
    vi.mocked(db.campaignTemplate.findFirst).mockResolvedValue({
      id: 'tmpl_1',
      shopId: 'shop_123',
    } as any);
    vi.mocked(db.campaignTemplate.update).mockResolvedValue({
      id: 'tmpl_1',
      name: 'Updated Offer',
    } as any);

    const res = await saveCampaignTemplate('Updated Offer', 'New Text', 'tmpl_1');
    expect(res.id).toBe('tmpl_1');
    expect(db.campaignTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tmpl_1' },
      data: {
        name: 'Updated Offer',
        bodyText: 'New Text',
      },
    });
  });

  it('deleteCampaignTemplate removes template when scoped to shop', async () => {
    vi.mocked(db.campaignTemplate.findFirst).mockResolvedValue({
      id: 'tmpl_1',
      shopId: 'shop_123',
    } as any);
    vi.mocked(db.campaignTemplate.delete).mockResolvedValue({ id: 'tmpl_1' } as any);

    await deleteCampaignTemplate('tmpl_1');

    expect(db.campaignTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 'tmpl_1', shopId: 'shop_123' },
    });
    expect(db.campaignTemplate.delete).toHaveBeenCalledWith({
      where: { id: 'tmpl_1' },
    });
  });

  it('logOutreachSent records campaign message in outreachLog', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue({
      id: 'c1',
      shopId: 'shop_123',
    } as any);
    vi.mocked(db.outreachLog.create).mockResolvedValue({
      id: 'log_1',
      channel: 'WHATSAPP',
    } as any);

    const log = await logOutreachSent('c1', 'tmpl_1', 'Hello Aarav');

    expect(log.id).toBe('log_1');
    expect(db.outreachLog.create).toHaveBeenCalledWith({
      data: {
        shopId: 'shop_123',
        customerId: 'c1',
        templateId: 'tmpl_1',
        messageText: 'Hello Aarav',
        channel: 'WHATSAPP',
      },
    });
  });
});
