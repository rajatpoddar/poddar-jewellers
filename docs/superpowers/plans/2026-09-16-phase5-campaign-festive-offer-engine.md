# Phase 5 Campaign & Festive Offer Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure-price-engine integrated Campaign & Festive Offer Engine with dynamic making charge discounts, hybrid scheduled hero banners, storefront offer ribbons, strikethrough pricing, and WhatsApp marketing broadcast integration.

**Architecture:** Extend Prisma schema with `Promotion` and `HeroSlide` models; update pure `src/lib/pricing/` engine to support basis-point making charge discounts and dual price breakdown (`totalPaise` vs `originalTotalPaise`); add Admin CRUD screens at `/admin/promotions` and `/admin/carousel`; render dynamic hero banners and promotional offer badges across storefront; and integrate active campaigns into WhatsApp Outreach Hub.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, PostgreSQL + Prisma 7, Vitest, React Server Actions.

**Spec:** [`docs/superpowers/specs/2026-09-16-phase5-campaign-festive-offer-engine-design.md`](file:///Users/rajatpoddar/Documents/Projects/poddar-jewellers/docs/superpowers/specs/2026-09-16-phase5-campaign-festive-offer-engine-design.md)

## Global Constraints

- **Hard Rule #1**: Price is NEVER stored in database (`cachedPriceMinPaise` and `cachedPriceMaxPaise` are for sorting/filtering only).
- **Hard Rule #2**: Customer sees one number in total; breakdown retained server-side for invoice.
- **Hard Rule #3**: Estimates round UP, never down.
- **Hard Rule #4**: Daily admin screen stays 30 seconds.
- **Hard Rule #7**: Zero hardcoded shop facts (`getShop()` must be used).
- **Hard Rule #8**: Multi-tenant additive model (`shopId` on every shop-owned table).
- **Hard Rule #9**: Design system compliance (tokens in `globals.css`, UI vocabulary in `src/components/ui/`, zero raw hex).

---

## File Structure

```
prisma/
  schema.prisma                       (Modify: Add PromotionScope, Promotion, ProductPromotion, HeroSlide)

src/lib/pricing/
  types.ts                            (Modify: PriceInput and PriceBreakdown type extensions)
  making.ts                           (Modify: calculateEffectiveMakingBp helper)
  engine.ts                           (Modify: calculate totalPaise vs originalTotalPaise)
  engine.test.ts                      (Modify: Add unit tests for promotional making charge discount)

src/lib/
  promotions.server.ts                (Create: Active promotion queries, resolution & CRUD)
  promotions.server.test.ts           (Create: Server integration tests for promotion resolution)
  hero-slides.server.ts               (Create: Hero slide queries & CRUD)
  hero-slides.server.test.ts          (Create: Server integration tests for hero slides)

src/app/admin/(panel)/
  promotions/
    page.tsx                          (Create: Admin Promotions Management page)
    actions.ts                        (Create: Server Actions for promotions)
  carousel/
    page.tsx                          (Create: Admin Hero Carousel Manager page)
    actions.ts                        (Create: Server Actions for hero slides)

src/components/store/
  HeroCarousel.tsx                    (Modify: Support dynamic database-driven HeroSlides)
  OfferBadge.tsx                      (Create: Promotional badge component)
  ProductPriceDisplay.tsx             (Create/Modify: Strikethrough pre-discount and live price display)

src/app/(store)/
  c/[...slug]/page.tsx                (Modify: Pass active category promotion to category view)
  p/[slug]/page.tsx                   (Modify: Pass active product promotion to PDP)

src/app/admin/(panel)/customers/outreach/
  page.tsx                            (Modify: Add active campaign selector to WhatsApp Outreach Hub)
```

---

### Task 1: Prisma Schema Migration & Models

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `src/lib/schema.test.ts`

**Interfaces:**
- Consumes: Prisma schema structure.
- Produces: `Promotion`, `ProductPromotion`, and `HeroSlide` models.

- [ ] **Step 1: Update Prisma schema**

Add `enum PromotionScope`, `model Promotion`, `model ProductPromotion`, `model HeroSlide` to `prisma/schema.prisma` and link `Shop` model with `promotions` and `heroSlides` fields.

- [ ] **Step 2: Run Prisma generate / migration**

Run: `npx prisma db push` or `npx prisma migrate dev --name phase5_promotions_and_hero_slides`
Expected: Database schema updated successfully.

- [ ] **Step 3: Update schema test to verify model presence**

Add assertion in `src/lib/schema.test.ts` verifying `prisma.promotion` and `prisma.heroSlide` delegate methods exist.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/schema.test.ts
git commit -m "feat(db): add Promotion and HeroSlide Prisma models"
```

---

### Task 2: Pricing Engine Extension (`src/lib/pricing/`)

**Files:**
- Modify: `src/lib/pricing/types.ts`
- Modify: `src/lib/pricing/making.ts`
- Modify: `src/lib/pricing/engine.ts`
- Test: `src/lib/pricing/engine.test.ts`

**Interfaces:**
- Consumes: `PriceInput` object.
- Produces: `estimate()` function with `promotionDiscountBp` support and `PriceBreakdown` with `originalTotalPaise`.

- [ ] **Step 1: Write failing unit test in `engine.test.ts`**

```ts
it("applies promotional making charge discount and returns original vs discounted totals", () => {
  const input: PriceInput = {
    weightMg: 10000, // 10g
    metalRatePerGramPaise: 700000, // Rs 7000/g -> 70,000 Paise
    makingCharge: { type: "percent", valueBp: 1000 }, // 10% making
    stoneValuePaise: 0,
    gstPercentBp: 300, // 3% GST
    roundingStepPaise: 10000, // Rs 100 step
    roundingSmallStepPaise: 1000,
    roundingThresholdPaise: 1000000,
    promotionDiscountBp: 2500, // 25% off making charges (10% becomes 7.5%)
  };
  const result = estimate(input);
  expect(result.hasDiscount).toBe(true);
  expect(result.totalPaise).toBeLessThan(result.originalTotalPaise!);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pricing/engine.test.ts`
Expected: FAIL (property `promotionDiscountBp` not recognized or `hasDiscount` undefined).

- [ ] **Step 3: Update `types.ts`, `making.ts`, and `engine.ts`**

Add `promotionDiscountBp?: number` to `PriceInput`. Update `making.ts` with `calculateEffectiveMakingBp()`. Update `estimate()` in `engine.ts` to compute both `totalPaise` and `originalTotalPaise`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pricing/engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/
git commit -m "feat(pricing): add promotional making charge discount to pure price engine"
```

---

### Task 3: Server Data Layer for Promotions (`src/lib/promotions.server.ts`)

**Files:**
- Create: `src/lib/promotions.server.ts`
- Create: `src/lib/promotions.server.test.ts`

**Interfaces:**
- Consumes: Prisma database client.
- Produces: `getActivePromotions()`, `resolveProductPromotion()`, `createPromotion()`, `togglePromotionActive()`.

- [ ] **Step 1: Write failing server test in `promotions.server.test.ts`**

Write test for resolving active promotion for a product given shopId, categoryId, and productId.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/promotions.server.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/promotions.server.ts`**

Implement helper functions: `getActivePromotions(shopId)`, `resolveProductPromotion(shopId, categoryId, productId)`, `createPromotion(...)`, `togglePromotionActive(id, isActive)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/promotions.server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/promotions.server.ts src/lib/promotions.server.test.ts
git commit -m "feat(server): add promotions server data layer and scoped resolver"
```

---

### Task 4: Server Data Layer for Hero Slides (`src/lib/hero-slides.server.ts`)

**Files:**
- Create: `src/lib/hero-slides.server.ts`
- Create: `src/lib/hero-slides.server.test.ts`

**Interfaces:**
- Consumes: Prisma database client.
- Produces: `getActiveHeroSlides(shopId)`, `createHeroSlide(...)`, `deleteHeroSlide(id)`.

- [ ] **Step 1: Write failing test in `hero-slides.server.test.ts`**

Test fetching active hero slides sorted by `sortOrder`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/hero-slides.server.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/hero-slides.server.ts`**

Implement CRUD & query functions for `HeroSlide`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/hero-slides.server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/hero-slides.server.ts src/lib/hero-slides.server.test.ts
git commit -m "feat(server): add hero slides data layer"
```

---

### Task 5: Admin Promotions & Carousel Management UI

**Files:**
- Create: `src/app/admin/(panel)/promotions/page.tsx`
- Create: `src/app/admin/(panel)/promotions/actions.ts`
- Create: `src/app/admin/(panel)/carousel/page.tsx`
- Create: `src/app/admin/(panel)/carousel/actions.ts`

**Interfaces:**
- Consumes: Server Actions and design system components (`Button`, `Field`, `Surface`, `Notice`, `Badge`).
- Produces: Admin panel pages at `/admin/promotions` and `/admin/carousel`.

- [ ] **Step 1: Implement Admin Promotions Page & Actions**

Build campaign creation modal/form, list view with live status badges (🟢 Active, 🟡 Scheduled, ⚪ Suspended), and 1-click emergency ON/OFF toggle switch.

- [ ] **Step 2: Implement Admin Carousel Page & Actions**

Build banner slide manager with image URL input, title, subtitle, CTA text & link, and promotion dropdown association.

- [ ] **Step 3: Verify with Design System & No Hardcoded Shop tests**

Run: `npx vitest run src/lib/design-system.test.ts src/lib/no-hardcoded-shop.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/\(panel\)/promotions/ src/app/admin/\(panel\)/carousel/
git commit -m "feat(admin): add promotions and carousel management screens"
```

---

### Task 6: Storefront Dynamic Banners & Offer Badges

**Files:**
- Modify: `src/components/store/HeroCarousel.tsx`
- Create: `src/components/store/OfferBadge.tsx`
- Create: `src/components/store/ProductPriceDisplay.tsx`
- Modify: `src/app/(store)/p/[slug]/page.tsx`
- Modify: `src/app/(store)/c/[...slug]/page.tsx`

**Interfaces:**
- Consumes: `HeroSlide`, `Promotion`, and `PriceBreakdown`.
- Produces: Dynamic hero carousel, offer badges, and strikethrough price display.

- [ ] **Step 1: Update `HeroCarousel.tsx` to render dynamic slides**

Accept `slides: HeroSlide[]` prop and render images, title, subtitle, and CTA button.

- [ ] **Step 2: Create `OfferBadge.tsx` and `ProductPriceDisplay.tsx`**

Render badge pill (e.g. `🎉 Dhanteras Special: 25% Off Making Charges`) and crossed-out pre-discount price alongside live estimated price.

- [ ] **Step 3: Wire active promotion resolution into PDP & Category pages**

Update product and category pages to resolve active promotions and pass down `promotionDiscountBp` to `estimate()`.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/components/store/ src/app/\(store\)/
git commit -m "feat(storefront): render dynamic hero banners, promo badges, and strikethrough prices"
```

---

### Task 7: WhatsApp Outreach Integration & Final Verification

**Files:**
- Modify: `src/app/admin/(panel)/customers/outreach/page.tsx`

**Interfaces:**
- Consumes: Active `Promotion` list.
- Produces: WhatsApp campaign message generator with active offer variables.

- [ ] **Step 1: Add Active Campaign selector to Outreach Hub**

Add dropdown selector in `/admin/customers/outreach` pre-filling campaign template variables (`{{PromotionName}}`, `{{DiscountText}}`).

- [ ] **Step 2: Run full build and test suite**

Run: `npm test && npm run typecheck && npm run build`
Expected: Clean exit code 0 across all checks.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(panel\)/customers/outreach/
git commit -m "feat(outreach): integrate active promotion campaign selector into WhatsApp Outreach Hub"
```
