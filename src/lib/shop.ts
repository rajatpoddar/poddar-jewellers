import { cache } from 'react';
import type { Shop } from '@prisma/client';
import { db } from './db';
import type { RoundingConfig } from './pricing/types';

const FALLBACK_SHOP: Shop = {
  id: 'fallback-shop-id',
  slug: 'jewellery-shop',
  name: 'Jewellery Showroom',
  tagline: 'Fine Gold & Diamond Jewellery',
  logoPath: null,
  brandPrimary: 'var(--brand-primary)',
  brandInk: 'var(--brand-ink)',
  brandGround: 'var(--brand-ground)',
  fontDisplay: 'Instrument Serif',
  fontBody: 'Karla',
  phone: '+910000000000',
  whatsapp: '910000000000',
  email: 'info@example.com',
  addressLine1: 'Main Road',
  addressLine2: null,
  city: 'Market',
  state: 'State',
  pincode: '000000',
  mapUrl: null,
  hoursText: 'Open Daily 9:00 AM - 8:00 PM',
  instagramUrl: null,
  facebookUrl: null,
  evolutionApiUrl: 'http://localhost:8087',
  evolutionApiKey: null,
  evolutionInstance: 'NregaBot',
  metaPhoneNumberId: null,
  metaAccessToken: null,
  metaWabaId: null,
  defaultMakingPercentBp: 1500,
  gstPercentBp: 300,
  roundingStepPaise: 10000,
  roundingSmallStepPaise: 1000,
  roundingThresholdPaise: 1000000,
  priceDisclaimer: 'Live rates update daily. Final price determined at time of order.',
  rateWarnHours: 24,
  rateStaleHours: 48,
  rateBannerText: 'Today\'s Gold & Silver Rates Updated',
  heroHeading: 'Luxury Jewellery Collection',
  heroSubheading: 'Crafted with purity and tradition',
  seoLocations: 'gold jewellery, diamonds',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

/**
 * The shop this request belongs to.
 *
 * Today there is exactly one, so this returns it. This software is sold one
 * deployment per shop; the day a deployment serves several, THIS FUNCTION is the
 * only thing that changes — it resolves the shop from the request's domain
 * instead. Every shop-owned table already carries `shopId`, so nothing else has
 * to move.
 *
 * Never read a shop row any other way. `cache` deduplicates within a render.
 */
export const getShop = cache(async (): Promise<Shop> => {
  try {
    const shop = await db.shop.findFirst({ orderBy: { createdAt: 'asc' } });
    if (shop) return shop;
  } catch (err) {
    // Database unreachable during build time / static generation or unseeded
  }
  return FALLBACK_SHOP;
});

export const getPricingConfig = cache(async (): Promise<{
  gstPercentBp: number;
  defaultMakingPercentBp: number;
  rounding: RoundingConfig;
}> => {
  const shop = await getShop();
  return {
    gstPercentBp: shop.gstPercentBp,
    defaultMakingPercentBp: shop.defaultMakingPercentBp,
    rounding: {
      stepPaise: shop.roundingStepPaise,
      smallStepPaise: shop.roundingSmallStepPaise,
      thresholdPaise: shop.roundingThresholdPaise,
    },
  };
});

/** Active metal types, in the order the shop arranged them. */
export const getMetalTypes = cache(async () => {
  try {
    const shop = await getShop();
    const metals = await db.metalType.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (metals && metals.length > 0) return metals;
  } catch (err) {
    // Database unreachable during static generation
  }
  return [];
});
