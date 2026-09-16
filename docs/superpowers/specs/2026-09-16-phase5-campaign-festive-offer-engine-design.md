# Phase 5 Design Spec — Campaign & Festive Offer Engine

**Date:** 2026-09-16  
**Status:** Approved  
**Phase:** Phase 5 (Campaign & Festive Offer Engine)  
**Target:** Poddar Jewellers Storefront, Admin Panel, Pure Price Engine & WhatsApp Outreach

---

## 1. Overview & Goals

Phase 5 introduces a full-fledged **Campaign & Festive Offer Engine** tailored specifically for Indian jewellery retail workflows (e.g. Dhanteras, Diwali, Akshaya Tritiya, Wedding Season). 

Key Objectives:
1. **Dynamic Making Charge Promotions**: Allow shop owners to configure percentage-based making charge discounts (e.g., 25% off making charges) across shop-wide, category-specific, or product-specific scopes.
2. **Pure Price Engine Integration**: Extend `src/lib/pricing/` without violating Hard Rule #1 (Price is never stored in DB) or Hard Rule #3 (Estimates round up). Calculate dual prices (`totalPaise` discounted and `originalTotalPaise` pre-discount) on the fly.
3. **Hybrid Scheduling & Emergency Control**: Automatic activation based on `startDate` and `endDate`, plus a 1-click manual `isActive` emergency toggle in Admin.
4. **Dynamic Hero Carousel & Storefront Badging**: Replace hardcoded hero carousel slides with dynamic, database-driven `HeroSlide` entries linked to active campaigns. Render promotional badges and strikethrough price comparisons (~~₹1,42,000~~ **₹1,38,500**) across the storefront.
5. **WhatsApp Marketing Alignment**: Seamlessly select active promotions inside `/admin/customers/outreach` to interpolate campaign variables (`{{PromotionName}}`, `{{DiscountText}}`, `{{ProductUrl}}`) for targeted WhatsApp customer broadcasts.

---

## 2. Architecture & Data Model

### 2.1 Prisma Schema Additions (`prisma/schema.prisma`)

```prisma
enum PromotionScope {
  SHOP_WIDE
  CATEGORY
  PRODUCT
}

model Promotion {
  id                      String         @id @default(cuid())
  shopId                  String
  shop                    Shop           @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  name                    String         // e.g. "Dhanteras Swarna Utsav 2026"
  headline                String         // e.g. "25% OFF Making Charges on Gold Jewellery"
  badgeText               String         // e.g. "Dhanteras Special"
  
  // Making Charge Discount in Basis Points (2500 = 25.00% discount on making charges)
  makingDiscountPercentBp Int
  
  scope                   PromotionScope @default(SHOP_WIDE)
  
  // Category scoping (used when scope = CATEGORY)
  categoryId              String?
  category                Category?      @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  
  // Product scoping (used when scope = PRODUCT)
  productPromotions       ProductPromotion[]
  
  // Hybrid Scheduling & Status
  startDate               DateTime
  endDate                 DateTime
  isActive                Boolean        @default(true) // Emergency ON/OFF toggle
  
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt

  heroSlides              HeroSlide[]

  @@index([shopId, isActive, startDate, endDate])
}

model ProductPromotion {
  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  promotionId String
  promotion   Promotion @relation(fields: [promotionId], references: [id], onDelete: Cascade)

  @@id([productId, promotionId])
}

model HeroSlide {
  id             String     @id @default(cuid())
  shopId         String
  shop           Shop       @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  title          String     // e.g. "Dhanteras Festive Collection"
  subtitle       String?    // e.g. "Get 25% Off Making Charges on Hallmark Gold"
  imageUrl       String     // Desktop background banner image
  mobileImageUrl String?    // Mobile responsive background image
  ctaText        String?    // e.g. "Explore Gold Necklaces"
  ctaUrl         String?    // e.g. "/c/gold/necklaces"
  
  sortOrder      Int        @default(0)
  isActive       Boolean    @default(true)
  startDate      DateTime?
  endDate        DateTime?
  
  promotionId    String?
  promotion      Promotion? @relation(fields: [promotionId], references: [id], onDelete: SetNull)

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([shopId, isActive, sortOrder])
}
```

---

## 3. Pure Price Engine Extension (`src/lib/pricing/`)

### 3.1 Types Update (`src/lib/pricing/types.ts`)

`PriceInput` is updated to include an optional parameter:

```ts
export interface PriceInput {
  weightMg: number;
  metalRatePerGramPaise: number;
  makingCharge: MakingChargeInput;
  stoneValuePaise: number;
  gstPercentBp: number;
  roundingStepPaise: number;
  roundingSmallStepPaise: number;
  roundingThresholdPaise: number;
  promotionDiscountBp?: number; // Integer basis points (e.g. 2500 = 25% off making charges)
}

export interface PriceBreakdown {
  metalValuePaise: number;
  baseMakingChargePaise: number;
  makingChargePaise: number;
  stoneValuePaise: number;
  subtotalPaise: number;
  gstAmountPaise: number;
  unroundedTotalPaise: number;
  totalPaise: number;
  originalTotalPaise?: number; // Pre-discount unrounded/rounded total if promo applied
  hasDiscount: boolean;
  discountAmountPaise: number;
}
```

### 3.2 Making Charge Calculation (`src/lib/pricing/making.ts`)

```ts
export function calculateEffectiveMakingBp(
  baseMakingBp: number,
  promotionDiscountBp?: number
): number {
  if (!promotionDiscountBp || promotionDiscountBp <= 0) return baseMakingBp;
  const clampedDiscount = Math.min(10000, promotionDiscountBp);
  return Math.max(0, Math.round((baseMakingBp * (10000 - clampedDiscount)) / 10000));
}
```

---

## 4. Admin Management Interfaces

### 4.1 Promotions Hub (`/admin/promotions`)
- **Campaign List View**: Displays all campaigns with status indicators (🟢 Active Now, 🟡 Scheduled, ⚪ Ended/Disabled).
- **1-Click Emergency Toggle**: Server Action to toggle `isActive` immediately.
- **Create/Edit Campaign Form**: Name, headline, badge text, making charge discount %, scope selector, and DateTime range picker.

### 4.2 Hero Slide Manager (`/admin/carousel`)
- **Slide List View**: Reorderable list (drag or numeric sort), live desktop/mobile image thumbnail preview.
- **Slide Form**: Upload/enter image URLs, title, subtitle, CTA button label & link, optional link to active `Promotion`.

---

## 5. Storefront Integration & UI

### 5.1 Homepage & Hero Carousel (`HeroCarousel.tsx`)
- Server component fetches active `HeroSlide` entries ordered by `sortOrder`.
- Client component renders interactive auto-playing hero banner with mobile/desktop responsive images and CTA links.

### 5.2 Header Announcement Bar
- Dynamic banner strip at the top of the site rendering active promotion headline when a campaign is active.

### 5.3 Category & Product Pages (`/c/...`, `/p/[slug]`)
- **Promotional Badge**: Badge pill (e.g., `🎉 Dhanteras Special: 25% Off Making Charges`) displayed on product detail page.
- **Strikethrough Price Comparison**: Renders original price crossed out alongside the live discounted estimate (e.g. ~~₹1,42,000~~ **₹1,38,500**).

---

## 6. WhatsApp Outreach Integration (`/admin/customers/outreach`)

- Outreach hub dropdown allowing selection of active `Promotion`.
- Interpolates:
  - `{{PromotionName}}` -> Campaign Name
  - `{{DiscountText}}` -> Discount summary text
  - `{{ProductUrl}}` -> Direct deep link to store category or product.

---

## 7. Testing Strategy

1. **Pure Pricing Engine Tests (`src/lib/pricing/engine.test.ts`)**:
   - Verify making charge discount application with pure basis points.
   - Verify dual total calculation (`totalPaise` vs `originalTotalPaise`).
   - Verify rounding step logic is preserved.
2. **Schema & Server Tests (`src/lib/promotions.server.ts`)**:
   - Unit tests for active promotion resolution by date & scope.
3. **Design System & Rule Guardrails**:
   - Ensure `no-hardcoded-shop.test.ts` and `design-system.test.ts` continue to pass 100%.

---

## 8. Non-Functional Requirements & Design Rules

- **Hard Rule #1 (Price is never stored)**: Absolutely maintained.
- **Hard Rule #3 (Estimates round up)**: Discounted totals round up to the nearest rounding step.
- **Hard Rule #7 (No shop fact hardcoded)**: Shop context passed via `getShop()`.
- **Hard Rule #9 (Design System Tokens)**: All UI elements use `src/components/ui/` vocabulary and CSS variable tokens.
