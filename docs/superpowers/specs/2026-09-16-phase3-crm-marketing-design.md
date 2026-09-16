# Phase 3 Design Spec: CRM Segmentation, Opt-In Direct Marketing & Public Rate Removal

**Date:** 2026-09-16  
**Status:** Approved / Drafted  
**Phase:** Phase 3 (CRM Segmentation & Opt-In Direct Marketing)  
**Target File Path:** `docs/superpowers/specs/2026-09-16-phase3-crm-marketing-design.md`

---

## 1. Overview & Objectives

Phase 3 builds the customer relationship management (CRM) segmentation engine, custom tagging infrastructure, opt-in consent capture system, and direct marketing outreach hub for Poddar Jewellers.

In addition, based on explicit shop owner directives, public metal rates display will be completely removed from the storefront. Metal rates remain an internal admin parameter for re-pricing calculations, while storefront customers see only final estimated total prices (`estimate()`).

### Key Objectives
1. **Public Metal Rates Removal:** Remove public `/rates` page, homepage rates strip, header rate badges, and per-gram rate references across the storefront. Redirect `/rates` to `/`.
2. **Opt-In Consent Capture:** Track explicit WhatsApp marketing consent (`marketingOptIn`, `optInSource`, `optInAt`) captured during WhatsApp OTP Login (`AuthModal.tsx`) and Order Booking (`BookOrderModal.tsx`).
3. **Data Model Extensions:** Add `CustomerTag` (many-to-many custom customer tags), `CampaignTemplate` (reusable marketing message templates with dynamic variable interpolation), and `OutreachLog` (audit trail of sent outreach messages).
4. **Smart Segmentation Engine:** Multi-criteria dynamic filtering in `/admin/customers` (by consent status, category activity/interest, upcoming event dates, wishlist total, location, and custom tags).
5. **Outreach & Broadcast Hub:** 1-click personalized WhatsApp deep-links (`wa.me`), live template preview, outreach logging, and CSV export for WhatsApp broadcast lists.

---

## 2. Storefront Clean-up & Consent Capture

### 2.1 Public Metal Rate Display Removal
* **Route Redirect:** Remove `/rates` route (`src/app/rates/page.tsx`). Add a permanent 301 redirect in `src/proxy.ts` / Next config from `/rates` to `/`.
* **Homepage (`src/app/page.tsx`):** Remove `DailyRatesStrip` component and references to daily metal rates.
* **Header (`src/components/layout/Header.tsx`):** Remove rate staleness warning banner and rates link.
* **Product Detail Page (`src/app/p/[slug]/page.tsx`):** Ensure price display strictly presents the final computed estimated total price (`Rs X,XX,XXX`), with no per-gram rate or metal breakdown exposed to storefront visitors.

### 2.2 Marketing Consent Capture
* **Schema Fields on `Customer`:**
  * `marketingOptIn`: `Boolean @default(false)`
  * `optInSource`: `String?` (Values: `"LOGIN_MODAL"`, `"BOOKING_MODAL"`, `"ADMIN_MANUAL"`)
  * `optInAt`: `DateTime?`
* **WhatsApp OTP Login (`AuthModal.tsx`):**
  * Step 3 (Name & profile registration for new customers) includes an explicit marketing consent checkbox:
    `[x] Receive exclusive festive offers & design updates on WhatsApp` (default checked).
* **Order Booking Modal (`BookOrderModal.tsx`):**
  * Submitting an order booking updates `marketingOptIn` and timestamp if consented.
* **Server Action Updates (`src/lib/auth.server.ts` & `src/lib/orders.server.ts`):**
  * Persist `marketingOptIn`, `optInSource`, and `optInAt` into the `Customer` record upon registration or booking.

---

## 3. Data Model & Schema Extensions

All new tables strictly include `shopId` to comply with **Hard Rule 8** (multitenancy ready).

### 3.1 `CustomerTag` Model
```prisma
model CustomerTag {
  id        String     @id @default(cuid())
  shopId    String
  name      String     // e.g., "VIP", "Bridal 2026", "Local Palojori"
  color     String?    // Visual badge token e.g., "gold", "blue", "emerald"
  createdAt DateTime   @default(now())
  customers Customer[] // Many-to-many relationship

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([shopId, name])
  @@index([shopId])
}
```

### 3.2 `CampaignTemplate` Model
```prisma
model CampaignTemplate {
  id        String   @id @default(cuid())
  shopId    String
  name      String   // e.g., "Wedding Season Offer", "Wishlist Followup"
  bodyText  String   // Template text with placeholders e.g., {{Name}}, {{Category}}, {{ShopPhone}}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shop        Shop          @relation(fields: [shopId], references: [id], onDelete: Cascade)
  outreachLogs OutreachLog[]

  @@index([shopId])
}
```

### 3.3 `OutreachLog` Model
```prisma
model OutreachLog {
  id          String   @id @default(cuid())
  shopId      String
  customerId  String
  templateId  String?
  messageText String
  channel     String   @default("WHATSAPP")
  sentAt      DateTime @default(now())

  customer Customer          @relation(fields: [customerId], references: [id], onDelete: Cascade)
  template CampaignTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  shop     Shop              @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId])
  @@index([customerId])
}
```

### 3.4 `Customer` Model Updates
```prisma
model Customer {
  // Existing fields...
  marketingOptIn  Boolean       @default(false)
  optInSource     String?
  optInAt         DateTime?
  tags            CustomerTag[]
  outreachLogs    OutreachLog[]
}
```

---

## 4. Admin CRM Hub UI & Segmentation Engine

### 4.1 Multi-Criteria Segment Filter Bar (`/admin/customers`)
The admin customer list will feature a dynamic filter bar:
1. **Consent Status:** `All` | `Opted-In Only` | `Non-Opted-In`
2. **Category Interest:** Dropdown of catalog categories (filters customers who viewed or wishlisted items in this category).
3. **Upcoming Occasion:** Filter by `Required-By` event date on booked orders (`Next 15 Days`, `Next 30 Days`, `Next 60 Days`).
4. **Wishlist Total:** Filter high-intent customers (Wishlist value > ₹50,000).
5. **Custom Tags:** Multi-select tag filter (`VIP`, `Bridal 2026`).
6. **Live Segment Counter:** Real-time indicator displaying matching customer count.

### 4.2 Customer Profile & Tagging (`/admin/customers/[id]`)
* **Tag Manager Badge Component (`TagBadgeSelect.tsx`):** 1-click badge dropdown to assign or remove tags on a customer profile.
* **Consent Indicator:** Displays consent status badge, source, and opt-in date.
* **Outreach History Timeline:** Section listing all previous campaign messages sent to this customer from `OutreachLog`.

### 4.3 Backend Server Module (`src/lib/crm.server.ts`)
* `getFilteredCustomers(filters)`: Executes optimized Prisma query with dynamic `WHERE` conditions.
* `createCustomerTag(name, color)` / `assignTagToCustomer(customerId, tagId)` / `removeTagFromCustomer(customerId, tagId)`.
* `getCampaignTemplates()` / `saveCampaignTemplate(name, bodyText)` / `deleteCampaignTemplate(id)`.
* `logOutreachSent(customerId, templateId, messageText)`.

---

## 5. Outreach & Broadcast Hub UI (`/admin/customers/outreach`)

### 5.1 Template & Variable Interpolation Engine
* **Template Selector:** Pick from saved `CampaignTemplate` records or write ad-hoc text.
* **Variable Interpolation:** Supported variables:
  * `{{CustomerName}}` -> Customer's full name (or `"Grahak"` fallback).
  * `{{WishlistCategory}}` -> Most viewed or highest value wishlist category.
  * `{{ShopName}}` -> Resolved from `getShop().name`.
  * `{{ShopPhone}}` -> Resolved from `getShop().phone`.
* **Live Message Preview:** Renders exact interpolated text for the active customer row.

### 5.2 1-Click WhatsApp Deep-Link & Logging
* Each customer row features a **"Send on WhatsApp"** primary action button.
* Clicking opens `https://wa.me/91<phone>?text=<encodedMessage>` in a new tab.
* Concurrently triggers `logOutreachSent()` via server action to record the message in `OutreachLog`.

### 5.3 Bulk Broadcast Export
* **"Export Broadcast CSV"** button generates a downloadable CSV formatted with columns: `Name, Phone, OptInStatus, TargetDate, Tags, PreferredCategory`.

---

## 6. Verification & Quality Assurance

1. **Unit Tests (`src/lib/crm.test.ts`):**
   * Consent update logic test.
   * Tag assignment & removal test.
   * Dynamic filter query builder test.
   * Template variable interpolation test (`{{CustomerName}}`, `{{ShopName}}`).
2. **Design System & Shop Neutrality Tests:**
   * Run `npm test` to verify `src/lib/no-hardcoded-shop.test.ts` and `src/lib/design-system.test.ts` pass cleanly.
3. **Build & Typecheck:**
   * Run `npm run typecheck` and `npm run build` to confirm zero TypeScript or Next.js build errors.
