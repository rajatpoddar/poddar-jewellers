# Phase 1B — Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete customer storefront (Phase 1B) for Poddar Jewellers — including homepage, category browsing with filtering/sorting, product detail page with live weight selector & dynamic price calculation, WhatsApp enquiry click-to-chat link, browser-local wishlist, rates page, contact page, search, and responsive design system layout.

**Architecture:**
- Route group `(store)` in Next.js App Router for customer pages, maintaining separate layout from `admin`.
- Server Components for pre-rendered pages & static data fetching + leaf Client Components (`'use client'`) for interactive widgets (weight selector, filter state, local wishlist).
- Dynamic price estimation on product detail pages via `estimate()` in `src/lib/pricing/engine.ts`. Listing pages filter and sort on cached price ranges (`cachedPriceMinPaise` / `cachedPriceMaxPaise`).
- Design system compliance enforced by `src/lib/design-system.test.ts` and `src/lib/no-hardcoded-shop.test.ts`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, PostgreSQL + Prisma 7, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-phase1-catalog-price-engine-design.md`

## Global Constraints

- **Price is never stored.** No `price` column. Prices are computed using `estimate()`.
- **Single number to customer.** No metal/making/GST breakdown on storefront. Display integer currency via `formatINR()`.
- **Estimates round up, never down.** Handled by engine's `roundUpToNearest()`.
- **No hardcoded shop facts.** All shop contact info, branding, hours, GST %, rounding steps, disclaimers fetched via `getShop()`.
- **Design System tokens only.** No raw hex codes, stock Tailwind palette classes, untokenised radii, or raw `<img>` tags. Use `src/components/ui/`.
- **Mobile-first.** Touch targets ≥ 44px. Tabular figures `.numeric` on rupee amounts, weights, and rates.

---

## File Structure Map

```
src/
  app/
    (store)/
      layout.tsx                 # Storefront root layout with header, rate banner, footer
      page.tsx                   # Storefront Homepage (hero, rate strip, categories, featured)
      c/
        [...slug]/page.tsx       # Category listing page with filters & sorting
      p/
        [slug]/page.tsx          # Product Detail Page (gallery, weight selector, WA button)
      rates/
        page.tsx                 # Today's metal rates & local acquisition page
      wishlist/
        page.tsx                 # Browser-local saved wishlist items
      search/
        page.tsx                 # Search page
      contact/
        page.tsx                 # Shop details, map, timings, contact options
  components/
    store/
      Header.tsx                 # Shop header with logo, search icon, wishlist badge, mobile nav
      Footer.tsx                 # Shop footer with contact, hours, copyright
      RateBanner.tsx             # Top rate strip & staleness warning banner
      CategoryTile.tsx           # Category card tile for grid
      ProductCard.tsx            # Product card for listing grids with price range & wishlist toggle
      WeightSelector.tsx         # Interactive weight chip selector ('use client')
      ProductGallery.tsx         # Image gallery viewer with thumbnail selection ('use client')
      WhatsAppButton.tsx         # WhatsApp click-to-chat deep link button
      FilterSidebar.tsx          # Drawer/Sidebar for category filters ('use client')
      WishlistProvider.tsx       # Wishlist Context & LocalStorage sync ('use client')
  lib/
    store.server.ts              # Data queries for storefront (featured products, categories, search)
```

---

### Task 1: Storefront Helper Data Queries (`src/lib/store.server.ts`)

**Files:**
- Create: `src/lib/store.server.ts`
- Test: `src/lib/store.server.test.ts`

**Interfaces:**
- Consumes: `src/lib/db.ts`, `src/lib/shop.ts`, `src/lib/pricing/engine.ts`
- Produces: `getHomepageData()`, `getCategoryProducts()`, `getProductBySlug()`, `getSearchProducts()`

- [ ] **Step 1: Write failing tests for store queries**

Create `src/lib/store.server.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatStorefrontPrice } from './store.server';

describe('formatStorefrontPrice', () => {
  it('formats amount using formatINR with approx suffix', () => {
    const formatted = formatStorefrontPrice(31800000); // 3,18,000 rupees in paise
    expect(formatted).toBe('Rs 3,18,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/store.server.test.ts`
Expected: FAIL with "Cannot find module" or "formatStorefrontPrice is not exported"

- [ ] **Step 3: Implement minimal store query helper**

Create `src/lib/store.server.ts`:
```typescript
import { db } from '@/lib/db';
import { getShop, getPricingConfig } from '@/lib/shop.server';
import { formatINR } from '@/lib/money';

export function formatStorefrontPrice(paise: number): string {
  return formatINR(paise);
}

export async function getHomepageData() {
  const shop = await getShop();
  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: { sortOrder: 'asc' },
    take: 8,
  });

  const featuredProducts = await db.product.findMany({
    where: { shopId: shop.id, status: 'LIVE', featured: true },
    include: { images: { orderBy: { sortOrder: 'asc' } }, weights: { orderBy: { sortOrder: 'asc' } }, category: true },
    take: 6,
  });

  return { shop, categories, featuredProducts };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/store.server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.server.ts src/lib/store.server.test.ts
git commit -m "feat(storefront): add storefront data queries and price formatting helper"
```

---

### Task 2: Storefront Navigation Header & Footer Components

**Files:**
- Create: `src/components/store/Header.tsx`
- Create: `src/components/store/Footer.tsx`
- Create: `src/components/store/RateBanner.tsx`
- Modify: `src/app/(store)/layout.tsx`
- Test: `src/components/store/Header.test.ts`

**Interfaces:**
- Consumes: `getShop()`, `src/components/ui/`, `src/lib/branding.ts`
- Produces: `<Header shop={shop} />`, `<Footer shop={shop} />`, `<RateBanner rateSet={rateSet} staleness={staleness} />`

- [ ] **Step 1: Write unit test for RateBanner staleness logic**

Create `src/components/store/RateBanner.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

export function getStalenessBannerText(hoursOld: number): string | null {
  if (hoursOld > 48) {
    return 'Rate 2 din se update nahi hua — confirm karne ke liye call kariye';
  }
  return null;
}

describe('getStalenessBannerText', () => {
  it('returns warning banner text if rates are >48 hours old', () => {
    expect(getStalenessBannerText(50)).toBe('Rate 2 din se update nahi hua — confirm karne ke liye call kariye');
  });

  it('returns null for fresh rates', () => {
    expect(getStalenessBannerText(12)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/components/store/RateBanner.test.ts`
Expected: PASS

- [ ] **Step 3: Implement Header, Footer and RateBanner components**

Create `src/components/store/RateBanner.tsx`:
```tsx
import { Notice } from '@/components/ui/Notice';
import { getStalenessBannerText } from './RateBanner.test';

export function RateBanner({ hoursOld }: { hoursOld: number }) {
  const warning = getStalenessBannerText(hoursOld);
  if (!warning) return null;
  return (
    <div className="bg-surface border-b border-line px-4 py-2 text-center text-sm">
      <Notice tone="warn">{warning}</Notice>
    </div>
  );
}
```

Create `src/components/store/Header.tsx`:
```tsx
import Link from 'next/link';
import { Shop } from '@prisma/client';
import { ButtonLink } from '@/components/ui/Button';

export function Header({ shop }: { shop: Shop }) {
  return (
    <header className="border-b border-line bg-surface sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold text-ink">
          {shop.name}
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-ink-muted">
          <Link href="/" className="hover:text-ink transition-colors">Home</Link>
          <Link href="/rates" className="hover:text-ink transition-colors">Aaj ka Rate</Link>
          <Link href="/wishlist" className="hover:text-ink transition-colors">Wishlist</Link>
          <Link href="/contact" className="hover:text-ink transition-colors">Contact</Link>
        </nav>
        <div className="flex items-center space-x-3">
          <Link href="/search" className="text-ink-muted hover:text-ink p-2" aria-label="Search">
            🔍
          </Link>
          <ButtonLink href={`https://wa.me/${shop.whatsappNumber}`} intent="secondary" size="md">
            WhatsApp
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
```

Create `src/components/store/Footer.tsx`:
```tsx
import { Shop } from '@prisma/client';

export function Footer({ shop }: { shop: Shop }) {
  return (
    <footer className="border-t border-line bg-surface text-ink-muted text-sm py-8 px-4 mt-16">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-display text-lg text-ink mb-2">{shop.name}</h3>
          <p>{shop.addressLine1}, {shop.addressLine2}</p>
          <p>{shop.city}, {shop.state} - {shop.pincode}</p>
        </div>
        <div>
          <h4 className="font-medium text-ink mb-2">Timing & Contact</h4>
          <p>Hours: {shop.openingHoursText}</p>
          <p>Phone: {shop.phone}</p>
        </div>
        <div>
          <h4 className="font-medium text-ink mb-2">Disclaimer</h4>
          <p className="text-xs text-ink-faint">{shop.disclaimerText}</p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Run design system test to verify no raw hex or Tailwind violations**

Run: `npx vitest run src/lib/design-system.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ src/app/\(store\)/layout.tsx
git commit -m "feat(storefront): add Header, Footer, and RateBanner components"
```

---

### Task 3: Storefront Homepage (`/`)

**Files:**
- Create: `src/app/(store)/page.tsx`
- Create: `src/components/store/CategoryTile.tsx`
- Create: `src/components/store/ProductCard.tsx`
- Test: `src/components/store/ProductCard.test.ts`

**Interfaces:**
- Consumes: `getHomepageData()`, `getLatestRates()`, `src/components/ui/`
- Produces: Storefront Homepage at `/`

- [ ] **Step 1: Write test for ProductCard pricing display**

Create `src/components/store/ProductCard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatINR } from '@/lib/money';

export function getPriceRangeLabel(minPaise: number | null, maxPaise: number | null): string {
  if (!minPaise) return 'Price on request';
  if (!maxPaise || minPaise === maxPaise) {
    return `${formatINR(minPaise)} (approx)`;
  }
  return `${formatINR(minPaise)} – ${formatINR(maxPaise)}`;
}

describe('getPriceRangeLabel', () => {
  it('formats range when min and max differ', () => {
    expect(getPriceRangeLabel(29380000, 36720000)).toBe('Rs 2,93,800 – Rs 3,67,200');
  });

  it('formats single price when min equals max', () => {
    expect(getPriceRangeLabel(8850000, 8850000)).toBe('Rs 88,500 (approx)');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/components/store/ProductCard.test.ts`
Expected: PASS

- [ ] **Step 3: Implement ProductCard & CategoryTile**

Create `src/components/store/ProductCard.tsx`:
```tsx
import Link from 'next/link';
import Image from 'next/image';
import { Product, ProductImage } from '@prisma/client';
import { Card } from '@/components/ui/Surface';
import { getPriceRangeLabel } from './ProductCard.test';

type ProductWithImages = Product & { images: ProductImage[] };

export function ProductCard({ product }: { product: ProductWithImages }) {
  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
  const priceLabel = getPriceRangeLabel(product.cachedPriceMinPaise, product.cachedPriceMaxPaise);

  return (
    <Card className="overflow-hidden group flex flex-col h-full">
      <Link href={`/p/${product.slug}`} className="block relative aspect-square bg-surface-sunk">
        {primaryImg ? (
          <Image
            src={primaryImg.path}
            alt={primaryImg.alt || product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-sm">
            No Image
          </div>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-display text-lg text-ink font-medium leading-tight">
            <Link href={`/p/${product.slug}`} className="hover:text-brand transition-colors">
              {product.name}
            </Link>
          </h3>
        </div>
        <div className="mt-3 pt-3 border-t border-line">
          <p className="text-sm font-semibold text-ink numeric">
            {priceLabel}
          </p>
          <p className="text-xs text-ink-faint mt-0.5">Aaj ke rate par anumaanit</p>
        </div>
      </div>
    </Card>
  );
}
```

Create `src/components/store/CategoryTile.tsx`:
```tsx
import Link from 'next/link';
import { Category } from '@prisma/client';
import { Card } from '@/components/ui/Surface';

export function CategoryTile({ category }: { category: Category }) {
  return (
    <Link href={`/c/${category.slug}`}>
      <Card className="p-6 text-center hover:border-line-strong transition-colors">
        <h3 className="font-display text-xl text-ink font-medium">{category.name}</h3>
        {category.description && (
          <p className="text-xs text-ink-muted mt-1">{category.description}</p>
        )}
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Implement Homepage `/` in `src/app/(store)/page.tsx`**

Create `src/app/(store)/page.tsx`:
```tsx
import { getHomepageData } from '@/lib/store.server';
import { getLatestRateSet } from '@/lib/rates.server';
import { ProductCard } from '@/components/store/ProductCard';
import { CategoryTile } from '@/components/store/CategoryTile';
import { ButtonLink } from '@/components/ui/Button';
import { formatINR } from '@/lib/money';

export default async function HomePage() {
  const { shop, categories, featuredProducts } = await getHomepageData();
  const rateSet = await getLatestRateSet();

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="bg-surface-sunk border-b border-line py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="font-display text-4xl md:text-5xl text-ink font-bold">
            {shop.heroTitle || shop.name}
          </h1>
          <p className="text-lg text-ink-muted max-w-xl mx-auto">
            {shop.heroSubtitle || 'Explore our exclusive collection with live daily gold and silver rates.'}
          </p>
        </div>
      </section>

      {/* Daily Rates Strip */}
      {rateSet && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="bg-surface border border-line rounded-card p-4 flex flex-wrap items-center justify-around gap-4 text-center">
            {rateSet.lines.map((line) => (
              <div key={line.metalType.id} className="space-y-1">
                <span className="text-xs text-ink-muted uppercase tracking-wider block font-medium">
                  {line.metalType.label}
                </span>
                <span className="font-display text-xl font-bold text-ink numeric">
                  {formatINR(line.pricePerGramPaise)} / g
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 space-y-6">
        <h2 className="font-display text-2xl text-ink font-bold">Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <CategoryTile key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink font-bold">Featured Collection</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: All tests pass, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(store\)/page.tsx src/components/store/
git commit -m "feat(storefront): implement homepage with hero, rate strip, categories and featured products"
```

---

### Task 4: Category Listing Page (`/c/[...slug]`) & Filtering

**Files:**
- Create: `src/app/(store)/c/[...slug]/page.tsx`
- Create: `src/components/store/FilterSidebar.tsx`
- Test: `src/app/(store)/c/category.test.ts`

**Interfaces:**
- Consumes: `db.category`, `db.product`, `src/components/store/ProductCard`
- Produces: Category listing route with filters (metal type, gender, occasion, price band)

- [ ] **Step 1: Write test for category slug resolution logic**

Create `src/app/(store)/c/category.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

export function parseSlugArray(slug: string[]): string {
  return slug[slug.length - 1];
}

describe('parseSlugArray', () => {
  it('extracts leaf category slug from array path', () => {
    expect(parseSlugArray(['gold', 'payal'])).toBe('payal');
    expect(parseSlugArray(['bangles'])).toBe('bangles');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/app/\(store\)/c/category.test.ts`
Expected: PASS

- [ ] **Step 3: Implement Category Listing Page**

Create `src/app/(store)/c/[...slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop.server';
import { ProductCard } from '@/components/store/ProductCard';

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ metal?: string; gender?: string; sort?: string }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { metal, gender, sort } = await searchParams;
  const leafSlug = slug[slug.length - 1];

  const shop = await getShop();
  const category = await db.category.findFirst({
    where: { shopId: shop.id, slug: leafSlug },
  });

  if (!category) {
    notFound();
  }

  const orderBy = sort === 'price_asc'
    ? { cachedPriceMinPaise: 'asc' as const }
    : sort === 'price_desc'
    ? { cachedPriceMinPaise: 'desc' as const }
    : { createdAt: 'desc' as const };

  const products = await db.product.findMany({
    where: {
      shopId: shop.id,
      categoryId: category.id,
      status: 'LIVE',
    },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
    orderBy,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-line pb-4">
        <h1 className="font-display text-3xl text-ink font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-ink-muted text-sm mt-1">{category.description}</p>
        )}
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-ink-muted">
          Is category mein abhi koi product nahi hai.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/\(store\)/c/
git commit -m "feat(storefront): implement category listing page with filters and sorting"
```

---

### Task 5: Product Detail Page (`/p/[slug]`) & Live Weight Selector

**Files:**
- Create: `src/app/(store)/p/[slug]/page.tsx`
- Create: `src/components/store/WeightSelector.tsx`
- Create: `src/components/store/ProductGallery.tsx`
- Create: `src/components/store/WhatsAppButton.tsx`
- Test: `src/components/store/WeightSelector.test.ts`

**Interfaces:**
- Consumes: `estimate()`, `getShop()`, `getLatestRateSet()`, `formatINR()`
- Produces: Interactive Product Detail Page with dynamic price updates & WhatsApp deep link

- [ ] **Step 1: Write test for WhatsApp message helper**

Create `src/components/store/WeightSelector.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

export function buildWhatsAppLink(
  whatsappNumber: string,
  productName: string,
  weightGrams: number,
  formattedPrice: string
): string {
  const text = `Namaste! Mujhe '${productName}' (${weightGrams}g - ${formattedPrice}) ke baare mein jaankari chahiye.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

describe('buildWhatsAppLink', () => {
  it('generates correct deep link with pre-filled Hinglish message', () => {
    const link = buildWhatsAppLink('919800000000', 'Rani Haar', 25, 'Rs 3,18,000');
    expect(link).toContain('https://wa.me/919800000000?text=');
    expect(decodeURIComponent(link)).toContain("Rani Haar' (25g - Rs 3,18,000)");
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/components/store/WeightSelector.test.ts`
Expected: PASS

- [ ] **Step 3: Implement WeightSelector Client Component**

Create `src/components/store/WeightSelector.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { ProductWeight } from '@prisma/client';
import { estimate } from '@/lib/pricing/engine';
import { RateSet } from '@/lib/pricing/types';
import { formatINR } from '@/lib/money';
import { buildWhatsAppLink } from './WeightSelector.test';
import { ButtonLink } from '@/components/ui/Button';

type Props = {
  productName: string;
  weights: ProductWeight[];
  rates: Record<string, number>;
  metalTypeKey: string;
  makingPercent: number;
  stoneValuePaise: number;
  gstPercentBp: number;
  whatsappNumber: string;
};

export function WeightSelector({
  productName,
  weights,
  rates,
  metalTypeKey,
  makingPercent,
  stoneValuePaise,
  gstPercentBp,
  whatsappNumber,
}: Props) {
  const [selectedWeight, setSelectedWeight] = useState<ProductWeight>(weights[0]);

  const priceResult = selectedWeight
    ? estimate({
        product: {
          metalTypeKey,
          makingPercent,
          stoneValuePaise,
        },
        selectedWeightGrams: selectedWeight.weightGrams,
        rates,
        gstPercentBp,
      })
    : null;

  const formattedPrice = priceResult ? formatINR(priceResult.displayPricePaise) : 'N/A';
  const waLink = priceResult && selectedWeight
    ? buildWhatsAppLink(whatsappNumber, productName, selectedWeight.weightGrams, formattedPrice)
    : '#';

  return (
    <div className="space-y-6">
      {/* Weight Selector Chips */}
      <div>
        <label className="text-sm font-medium text-ink block mb-2">Weight Select Karein:</label>
        <div className="flex flex-wrap gap-2">
          {weights.map((w) => {
            const isSelected = w.id === selectedWeight?.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWeight(w)}
                className={`px-4 py-2 text-sm font-medium rounded-field border transition-colors ${
                  isSelected
                    ? 'border-brand bg-brand-soft text-brand font-semibold'
                    : 'border-line bg-surface text-ink hover:border-line-strong'
                }`}
              >
                {w.weightGrams} gram
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Price Display */}
      <div className="bg-surface-sunk border border-line rounded-card p-6 space-y-2">
        <span className="text-xs text-ink-muted uppercase tracking-wider block">Estimated Price</span>
        <div className="font-display text-3xl font-bold text-ink numeric">
          {formattedPrice} <span className="text-sm font-normal text-ink-muted">(approx.)</span>
        </div>
        <p className="text-xs text-ink-faint">
          Aaj ke rate par anumaanit, sab tax shaamil. Final price bill banate samay weigh machine par decide hoga.
        </p>
      </div>

      {/* WhatsApp Action */}
      <ButtonLink href={waLink} intent="primary" size="lg" className="w-full justify-center">
        WhatsApp Par Poochhein
      </ButtonLink>
    </div>
  );
}
```

- [ ] **Step 4: Implement Product Gallery & Product Detail Page**

Create `src/components/store/ProductGallery.tsx`:
```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@prisma/client';

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [activeImage, setActiveImage] = useState(images[0]);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-surface-sunk rounded-card border border-line flex items-center justify-center text-ink-faint">
        No Image Available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square rounded-card overflow-hidden bg-surface border border-line">
        <Image
          src={activeImage.path}
          alt={activeImage.alt || name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setActiveImage(img)}
              className={`relative w-20 h-20 rounded-field overflow-hidden border transition-colors flex-shrink-0 ${
                img.id === activeImage.id ? 'border-brand ring-2 ring-brand' : 'border-line'
              }`}
            >
              <Image src={img.path} alt={img.alt || name} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `src/app/(store)/p/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getShop, getPricingConfig } from '@/lib/shop.server';
import { getLatestRateSet } from '@/lib/rates.server';
import { ProductGallery } from '@/components/store/ProductGallery';
import { WeightSelector } from '@/components/store/WeightSelector';
import { resolveMakingPercent } from '@/lib/pricing/making';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShop();
  const pricingConfig = await getPricingConfig();
  const latestRateSet = await getLatestRateSet();

  const product = await db.product.findFirst({
    where: { shopId: shop.id, slug, status: 'LIVE' },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      weights: { orderBy: { sortOrder: 'asc' } },
      metalType: true,
      category: true,
    },
  });

  if (!product || !latestRateSet) {
    notFound();
  }

  // Convert rateSet lines to key-value record
  const rateMap: Record<string, number> = {};
  latestRateSet.lines.forEach((line) => {
    rateMap[line.metalType.key] = line.pricePerGramPaise;
  });

  const effectiveMaking = resolveMakingPercent({
    productMakingPercent: product.makingPercent,
    categoryMakingPercent: product.category?.makingPercent ?? null,
    shopDefaultMakingPercent: pricingConfig.defaultMakingPercent,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-12">
      <ProductGallery images={product.images} name={product.name} />

      <div className="space-y-6">
        <div>
          <span className="text-xs text-ink-muted uppercase tracking-wider block font-medium">
            {product.category?.name} · {product.metalType.label}
          </span>
          <h1 className="font-display text-3xl font-bold text-ink mt-1">{product.name}</h1>
          {product.description && (
            <p className="text-ink-muted text-sm mt-3">{product.description}</p>
          )}
        </div>

        {product.stoneDescription && (
          <div className="text-sm bg-surface border border-line p-3 rounded-card text-ink-muted">
            <strong className="text-ink font-medium">Stone Info:</strong> {product.stoneDescription}
          </div>
        )}

        <WeightSelector
          productName={product.name}
          weights={product.weights}
          rates={rateMap}
          metalTypeKey={product.metalType.key}
          makingPercent={effectiveMaking.effectivePercent}
          stoneValuePaise={product.stoneValuePaise}
          gstPercentBp={pricingConfig.gstPercentBp}
          whatsappNumber={shop.whatsappNumber}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/\(store\)/p/ src/components/store/
git commit -m "feat(storefront): implement product detail page with live weight selector & WhatsApp link"
```

---

### Task 6: Rates Page (`/rates`), Contact Page (`/contact`) & Search (`/search`)

**Files:**
- Create: `src/app/(store)/rates/page.tsx`
- Create: `src/app/(store)/contact/page.tsx`
- Create: `src/app/(store)/search/page.tsx`

**Interfaces:**
- Consumes: `getShop()`, `getLatestRateSet()`, `formatINR()`
- Produces: Rates, Contact, and Search routes

- [ ] **Step 1: Implement `/rates` page**

Create `src/app/(store)/rates/page.tsx`:
```tsx
import { getShop } from '@/lib/shop.server';
import { getLatestRateSet } from '@/lib/rates.server';
import { formatINR } from '@/lib/money';

export default async function RatesPage() {
  const shop = await getShop();
  const rateSet = await getLatestRateSet();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl text-ink font-bold">Aaj ka Gold & Silver Rate</h1>
        <p className="text-ink-muted text-sm">
          {shop.city}, {shop.state} ke liye aaj ke certified metal rates
        </p>
      </div>

      {rateSet ? (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="p-4 border-b border-line bg-surface-sunk text-xs text-ink-muted flex justify-between items-center">
            <span>Last Updated: {new Date(rateSet.effectiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>Verified by {shop.name}</span>
          </div>
          <div className="divide-y divide-line">
            {rateSet.lines.map((line) => (
              <div key={line.metalType.id} className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">{line.metalType.label}</h3>
                  <p className="text-xs text-ink-faint">Per gram rate</p>
                </div>
                <div className="font-display text-2xl font-bold text-ink numeric">
                  {formatINR(line.pricePerGramPaise)} / g
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-ink-muted py-8">Rate detail abhi available nahi hai.</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `/contact` page**

Create `src/app/(store)/contact/page.tsx`:
```tsx
import { getShop } from '@/lib/shop.server';
import { ButtonLink } from '@/components/ui/Button';

export default async function ContactPage() {
  const shop = await getShop();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="border-b border-line pb-4">
        <h1 className="font-display text-4xl text-ink font-bold">Contact & Location</h1>
        <p className="text-ink-muted text-sm mt-1">Aapke nazdeeki jewellery shop par aaiye</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-ink font-semibold">{shop.name}</h2>
          <div className="text-ink-muted text-sm space-y-1">
            <p>{shop.addressLine1}</p>
            <p>{shop.addressLine2}</p>
            <p>{shop.city}, {shop.state} - {shop.pincode}</p>
          </div>
          <div className="pt-2 text-sm text-ink-muted">
            <p><strong>Phone:</strong> {shop.phone}</p>
            <p><strong>Timing:</strong> {shop.openingHoursText}</p>
          </div>
          <div className="pt-4">
            <ButtonLink href={`https://wa.me/${shop.whatsappNumber}`} intent="primary" size="lg">
              WhatsApp Chat
            </ButtonLink>
          </div>
        </div>

        {shop.googleMapsUrl && (
          <div className="bg-surface-sunk border border-line rounded-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-xl text-ink font-semibold mb-2">Google Map Location</h3>
              <p className="text-sm text-ink-muted">Shop par aane ke liye Google Maps direction lein.</p>
            </div>
            <div className="mt-6">
              <ButtonLink href={shop.googleMapsUrl} intent="secondary" size="md" target="_blank" rel="noopener noreferrer">
                Google Maps Mein Kholein 🗺️
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run full test suite & design system rules check**

Run: `npm test && npm run typecheck`
Expected: All 111+ tests pass cleanly!

- [ ] **Step 4: Commit**

```bash
git add src/app/\(store\)/
git commit -m "feat(storefront): implement Rates and Contact pages"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-14-phase1b-storefront.md`.
