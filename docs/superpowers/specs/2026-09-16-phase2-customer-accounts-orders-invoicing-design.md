# Phase 2 Design Specification — Customer Accounts, CRM Activity Tracking, WhatsApp Auth & Luxury A4 Invoicing

**Date:** 2026-09-16  
**Status:** Approved by Owner  
**Target Phase:** Phase 2  
**Prerequisites:** Phase 1A (Admin & Price Engine) & Phase 1B (Storefront, Wishlist & Search) Complete.

---

## 1. Executive Summary

Phase 2 transforms the Poddar Jewellers storefront into a full-featured customer portal and marketing CRM. It allows customers to authenticate via WhatsApp OTP (Evolution API), sync wishlists across devices, book designs with a required-by target date (e.g. for weddings or festivals), and receive or collect A4 luxury printable GST invoices.

For the shop owner, Phase 2 provides an actionable CRM dashboard: bulk diary contact import (100+ offline customer records), live customer activity tracking (product views, wishlist items, search terms), and direct 1-tap WhatsApp outreach to convert high-intent browsers into counter buyers.

---

## 2. Key Architecture & Multi-Tenancy Design

1. **Additive Multi-Tenancy:** Every new database table (`Customer`, `CustomerSession`, `CustomerActivity`, `WishlistItem`, `Order`, `OrderItem`) carries a `shopId` column referencing `Shop.id`.
2. **Evolution API Integration:** Configurable Evolution API credentials (`apiUrl`, `apiKey`, `instance`) stored on the `Shop` row, defaulting to `http://192.168.29.101:8087` and instance `NregaBot`.
3. **Price Engine Integrity:** All order prices retain full server-side itemized calculations (Metal value + Making charges + Stone value + 3% GST + Rounding up step). Invoices are rendered from immutable historical snapshots stored on `Order` and `OrderItem`.
4. **Design System & Aesthetics:** All new storefront and admin UI components strictly adhere to `docs/DESIGN-SYSTEM.md` using semantic tokens (`bg-surface`, `text-ink`, `border-line`, `intent="primary"`). No raw hex values or un-tokenized Tailwind palette classes.

---

## 3. Database Schema Specification

The following models will be added to `prisma/schema.prisma`:

```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  READY
  COMPLETED
  CANCELLED
}

enum ActivityType {
  PRODUCT_VIEW
  WISHLIST_ADD
  WISHLIST_REMOVE
  SEARCH_QUERY
  WHATSAPP_ENQUIRE
}

model Customer {
  id     String @id @default(cuid())
  shopId String
  shop   Shop   @relation(fields: [shopId], references: [id], onDelete: Cascade)

  phone        String
  name         String
  addressLine1 String?
  addressLine2 String?
  city         String?
  pincode      String?
  notes        String? // Diary notes (e.g., preference, family relation)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sessions   CustomerSession[]
  wishlist   WishlistItem[]
  orders     Order[]
  activities CustomerActivity[]

  @@unique([shopId, phone])
  @@index([shopId, phone])
}

model CustomerSession {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([customerId])
  @@index([token])
}

model OtpVerification {
  id         String    @id @default(cuid())
  shopId     String
  phone      String
  otpHash    String
  expiresAt  DateTime
  attempts   Int       @default(0)
  verifiedAt DateTime?
  createdAt  DateTime  @default(now())

  @@index([shopId, phone])
}

model WishlistItem {
  id         String   @id @default(cuid())
  shopId     String
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([customerId, productId])
  @@index([shopId, customerId])
}

model CustomerActivity {
  id         String   @id @default(cuid())
  shopId     String
  shop       Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)

  sessionId String?
  eventType ActivityType
  productId String?
  product   Product?     @relation(fields: [productId], references: [id], onDelete: SetNull)

  metadata  String?  // JSON string for extra data (e.g., search term, weight selected)
  createdAt DateTime @default(now())

  @@index([shopId, customerId, createdAt])
  @@index([shopId, eventType])
}

model Order {
  id          String      @id @default(cuid())
  shopId      String
  shop        Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  orderNumber String      @unique
  customerId  String
  customer    Customer    @relation(fields: [customerId], references: [id])
  status      OrderStatus @default(PENDING)

  requiredByDate DateTime? // e.g. Marriage or Festival target date
  customerNotes  String?

  // Financial breakdown snapshot (paise)
  metalPaise      Int
  makingPaise     Int
  stonePaise      Int
  gstPaise        Int
  roundingPaise   Int
  totalPaise      Int

  items     OrderItem[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([shopId, status])
  @@index([shopId, customerId])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  product     Product @relation(fields: [productId], references: [id])

  productName     String
  weightMg        Int
  weightGrams     Float
  metalRatePaise  Int
  makingPercentBp Int
  stoneValuePaise Int
  pricePaise      Int

  @@index([orderId])
}
```

Plus additions to `Shop` model:
- `evolutionApiUrl String @default("http://192.168.29.101:8087")`
- `evolutionApiKey String?`
- `evolutionInstance String @default("NregaBot")`

---

## 4. WhatsApp Transactional OTP Engine

1. **Evolution API Service (`src/lib/whatsapp/evolution.ts`):**
   - Reads `evolutionApiUrl`, `evolutionApiKey`, `evolutionInstance` from `getShop()`.
   - Sends OTP text message via `POST ${evolutionApiUrl}/message/sendText/${evolutionInstance}`.
   - Message Format:
     > *"Namaste! Poddar Jewellers website sign-in ke liye aapka OTP hai **[OTP]**. Yeh code 5 minute tak valid hai."*
2. **OTP Generation & Verification Rules:**
   - 6-digit numeric OTP generated via crypto random.
   - Hash stored in `OtpVerification` with 5-minute expiry.
   - Rate limit: max 3 failed attempts per OTP token; max 3 OTP requests per phone per hour.
3. **Dev Fallback:**
   - If Evolution API call fails or is unreachable in local dev environment, OTP is printed to stdout log so local testing is never blocked.

---

## 5. Customer Authentication & Onboarding Flow

```
[Customer enters 10-digit Phone] ──> [Generate & Send OTP via WhatsApp]
                                                │
                                                ▼
                                    [Customer enters OTP]
                                                │
                                      (Verify Hash & Expiry)
                                                │
                          ┌─────────────────────┴─────────────────────┐
                          ▼                                           ▼
             [Phone EXISTS in Customer DB]             [Phone NOT in Customer DB]
                          │                                           │
                          ▼                                           ▼
               [Create Session Cookie]                  [Show Name & Address Modal]
                          │                                           │
                          ▼                                           ▼
               [Sync Local Wishlist]                    [Save Customer Profile & Session]
```

1. **Seamless Sign-In:** Customer clicks "Sign In" or "Book Design" / "Save Wishlist".
2. **Dairy Pre-Import Advantage:** If the owner has already imported the customer's mobile number from the physical diary, the system immediately recognizes the phone and logs the user in after OTP verification without asking for address re-entry!
3. **New Customer Onboarding:** If new, a clean modal prompts for Full Name, Address Line, City, and Pincode.
4. **Wishlist Syncing:** On login, any items stored in browser `localStorage` are automatically upserted into `WishlistItem` table in PostgreSQL, clearing the temporary client state.

---

## 6. Dairy Contact Import & Admin CRM (`/admin/customers`)

### 6.1 Diary Bulk Import (`/admin/customers/import`)
- CSV File Upload or Multi-line Text Box.
- Format: `Name, Phone, Address Line 1, City, Pincode, Notes`.
- Parser cleans phone numbers (strip spaces/dashes, prepend standard Indian +91 format).
- Upserts customer records into `Customer` table linked to current `shopId`.

### 6.2 Customer Activity Analytics (`/admin/customers/[id]`)
- **Event Tracker Middleware/Client Helper:** Automatically logs client interactions (`PRODUCT_VIEW`, `WISHLIST_ADD`, `SEARCH_QUERY`) silently in background.
- **Customer Profile View:** Shows:
  - Total items viewed, active wishlist items, order history.
  - Interactive activity timeline (e.g. *"Viewed 22K Royal Rani Haar 4 times in the last 24h"*).
  - 1-click **WhatsApp Outreach Button** pre-populated with tailored message:
    > *"Namaste [Customer Name]! Humne dekha aap '22K Royal Rani Haar' pasand kar rahe the. Kya aap iska live showroom demo chahenge?"*

---

## 7. Orders & A4 Luxury Color Printable Invoicing

### 7.1 Order Placement
- Customer clicks **"Book / Reserve Design"** on Product Detail Page or Wishlist.
- Selects target date (*"Required By Date"* e.g. 24th October for marriage/Dhanteras).
- Optional special instructions note.
- Server calculates exact price breakdown (`estimate()`) at current metal rate, creates `Order` + `OrderItem` in `PENDING` state, and returns order confirmation screen + pre-filled WhatsApp confirmation deep link.

### 7.2 Admin Order Management (`/admin/orders`)
- Orders table with filter by status (`PENDING`, `CONFIRMED`, `READY`, `COMPLETED`, `CANCELLED`).
- Quick status update controls.
- **Action Buttons:**
  - *Send WhatsApp Receipt / Confirmation*
  - *Print A4 Luxury GST Invoice*

### 7.3 A4 Luxury Color Printable Invoice Design
- Dedicated route `/admin/orders/[id]/invoice` optimized for `@media print` with A4 page dimensions (210mm x 297mm).
- **Visual Design:**
  - Double gold accent border frame (`brandPrimary`).
  - Poddar Jewellers logo / Header title block, shop GSTIN, address, contact numbers.
  - Customer Name, Address, Phone, Invoice Number, Order Date, Required-By Date.
  - Itemized Breakdown Table:
    - Product Description, HSN Code (7113)
    - Net Gold Weight (g)
    - Today's Metal Rate (Rs/g)
    - Metal Amount (Rs)
    - Making Charges (% & Amount Rs)
    - Fixed Stone Value (Rs)
    - Subtotal (Rs)
    - GST 3% (CGST 1.5% + SGST 1.5%)
    - Total Amount (Rs)
  - Terms & Conditions disclaimer, Bank account details for payment, Authorized Signatory stamp box.

---

## 8. Verification & Test Plan

1. **Unit Tests:**
   - Evolution API payload builder & phone sanitizer.
   - OTP generation, hashing, and expiration validation.
   - Diary CSV import parser (handles messy input, phone number normalization).
   - Order price breakdown snapshot calculations.
2. **Integration & Rule Verification:**
   - `src/lib/no-hardcoded-shop.test.ts` (ensures zero hardcoded shop names/numbers).
   - `src/lib/design-system.test.ts` (ensures zero un-tokenized palette classes or hexes).
   - `npm run typecheck` & `npm run build` production verification.

---

## 9. Next Action

Ask human partner to review this specification document. Once approved, invoke `writing-plans` skill to generate the step-by-step implementation plan.
