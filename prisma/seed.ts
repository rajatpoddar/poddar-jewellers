import { PrismaClient, ProductStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

try {
  process.loadEnvFile();
} catch {
  // No .env file — expected in a container, where the variables are already set.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const rs = (rupees: number) => Math.round(rupees * 100);

const SHOP_SLUG = 'poddar-jewellers';

async function main() {
  // ── The shop ────────────────────────────────────────────────────────────
  // Seed values only. Every one of these is editable from the admin panel;
  // nothing here may ever be read from source. See Hard Rule 7 in CLAUDE.md.
  const shop = await db.shop.upsert({
    where: { slug: SHOP_SLUG },
    update: {},
    create: {
      slug: SHOP_SLUG,
      name: 'Poddar Jewellers',
      tagline: 'Palojori, Deoghar',
      phone: '7250580175',
      whatsapp: '917250580175',
      email: 'rajatpoddar17@gmail.com',
      addressLine1: 'Main Road Palojori',
      city: 'Deoghar',
      state: 'Jharkhand',
      pincode: '814146',
      hoursText: 'Online 24x7',
      priceDisclaimer: 'Aaj ke rate par anumaanit, sab tax shaamil. Final price dukaan par tay hoga.',
      rateBannerText: 'Rate 2 din se update nahi hua — confirm karne ke liye call kariye.',
      heroHeading: 'Ghar baithe humari dukaan dekhiye',
      heroSubheading: 'Har design, har weight, aaj ke rate par.',
      seoLocations: 'Palojori,Deoghar,Jharkhand,Asansol',
    },
  });

  // ── Metal types ─────────────────────────────────────────────────────────
  // What THIS shop deals in. Another shop would seed a different set, and any
  // shop can add to it from the admin panel.
  const metalSeed = [
    { key: 'GOLD_24K', label: 'Gold 24K', rupeesPerGram: 13530 },
    { key: 'GOLD_22K', label: 'Gold 22K', rupeesPerGram: 12400 },
    { key: 'GOLD_18K', label: 'Gold 18K', rupeesPerGram: 10150 },
    { key: 'SILVER_999', label: 'Silver 999', rupeesPerGram: 216 },
  ];

  const metals: Record<string, string> = {};
  for (const [i, m] of metalSeed.entries()) {
    const row = await db.metalType.upsert({
      where: { shopId_key: { shopId: shop.id, key: m.key } },
      update: {},
      create: { shopId: shop.id, key: m.key, label: m.label, sortOrder: i },
    });
    metals[m.key] = row.id;
  }

  // ── Admin user ──────────────────────────────────────────────────────────
  const username = process.env.SEED_ADMIN_USERNAME ?? 'rajat';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required to seed an admin user');

  await db.adminUser.upsert({
    where: { username },
    update: {},
    create: {
      shopId: shop.id,
      username,
      name: 'Rajat Poddar',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  // ── Categories ──────────────────────────────────────────────────────────
  const categorySeed = [
    { slug: 'necklaces', name: 'Necklaces', children: [{ slug: 'chokers', name: 'Chokers' }, { slug: 'chains', name: 'Chains' }] },
    { slug: 'rings', name: 'Rings', children: [] },
    { slug: 'earrings', name: 'Earrings', children: [] },
    { slug: 'bangles', name: 'Bangles', children: [] },
    { slug: 'payal', name: 'Payal', children: [] },
    { slug: 'mangalsutra', name: 'Mangalsutra', children: [] },
  ];

  for (const [i, c] of categorySeed.entries()) {
    const parent = await db.category.upsert({
      where: { shopId_slug: { shopId: shop.id, slug: c.slug } },
      update: {},
      create: { shopId: shop.id, slug: c.slug, name: c.name, sortOrder: i },
    });
    for (const [j, child] of c.children.entries()) {
      await db.category.upsert({
        where: { shopId_slug: { shopId: shop.id, slug: child.slug } },
        update: {},
        create: { shopId: shop.id, slug: child.slug, name: child.name, parentId: parent.id, sortOrder: j },
      });
    }
  }

  // ── Attribute groups ────────────────────────────────────────────────────
  // "Metal" is an attribute rather than a column: it is a browsing facet, and a
  // shop that sells platinum should be able to add that value itself.
  const groups = [
    { key: 'METAL', name: 'Metal', values: ['gold', 'silver', 'diamond'] },
    { key: 'OCCASION', name: 'Occasion', values: ['wedding', 'daily-wear', 'gifting', 'festive'] },
    { key: 'GENDER', name: 'For', values: ['women', 'men', 'kids', 'teens'] },
    { key: 'STYLE', name: 'Style', values: ['traditional', 'modern', 'minimal'] },
  ];

  const attributes: Record<string, string> = {};
  for (const [i, g] of groups.entries()) {
    const group = await db.attributeGroup.upsert({
      where: { shopId_key: { shopId: shop.id, key: g.key } },
      update: {},
      create: { shopId: shop.id, key: g.key, name: g.name, sortOrder: i },
    });
    for (const [j, slug] of g.values.entries()) {
      const name = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      const row = await db.attribute.upsert({
        where: { groupId_slug: { groupId: group.id, slug } },
        update: {},
        create: { groupId: group.id, slug, name, sortOrder: j },
      });
      attributes[`${g.key}:${slug}`] = row.id;
    }
  }

  // ── Opening rate ────────────────────────────────────────────────────────
  if ((await db.rate.count({ where: { shopId: shop.id } })) === 0) {
    await db.rate.create({
      data: {
        shopId: shop.id,
        enteredBy: 'seed',
        lines: {
          create: metalSeed.map((m) => ({
            metalTypeId: metals[m.key],
            pricePerGramPaise: rs(m.rupeesPerGram),
          })),
        },
      },
    });
  }

  // ── Sample products ─────────────────────────────────────────────────────
  const categoryId = async (slug: string) =>
    (await db.category.findUniqueOrThrow({ where: { shopId_slug: { shopId: shop.id, slug } } })).id;

  const samples = [
    {
      slug: 'traditional-payal', name: 'Traditional Payal',
      metalKey: 'GOLD_22K', category: 'payal',
      stoneValuePaise: 0, stoneDescription: null,
      weightsMg: [20000, 23000, 25000],
      attributeKeys: ['METAL:gold', 'OCCASION:wedding', 'GENDER:women'],
    },
    {
      slug: 'silver-payal-classic', name: 'Classic Silver Payal',
      metalKey: 'SILVER_999', category: 'payal',
      stoneValuePaise: 0, stoneDescription: null,
      weightsMg: [30000, 40000, 50000],
      attributeKeys: ['METAL:silver', 'OCCASION:daily-wear', 'GENDER:women'],
    },
    {
      slug: 'solitaire-ring', name: 'Solitaire Ring',
      metalKey: 'GOLD_18K', category: 'rings',
      stoneValuePaise: rs(45000), stoneDescription: '0.50ct',
      weightsMg: [3500, 4200, 5000],
      attributeKeys: ['METAL:diamond', 'OCCASION:gifting', 'GENDER:women'],
    },
  ];

  for (const s of samples) {
    const product = await db.product.upsert({
      where: { shopId_slug: { shopId: shop.id, slug: s.slug } },
      update: {},
      create: {
        shopId: shop.id,
        slug: s.slug,
        name: s.name,
        metalTypeId: metals[s.metalKey],
        categoryId: await categoryId(s.category),
        stoneValuePaise: s.stoneValuePaise,
        stoneDescription: s.stoneDescription,
        status: ProductStatus.LIVE,
        featured: true,
      },
    });

    for (const [i, weightMg] of s.weightsMg.entries()) {
      await db.productWeight.upsert({
        where: { productId_weightMg: { productId: product.id, weightMg } },
        update: {},
        create: { productId: product.id, weightMg, sortOrder: i },
      });
    }

    for (const key of s.attributeKeys) {
      await db.productAttribute.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: attributes[key] } },
        update: {},
        create: { productId: product.id, attributeId: attributes[key] },
      });
    }
  }

  console.log('Seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
